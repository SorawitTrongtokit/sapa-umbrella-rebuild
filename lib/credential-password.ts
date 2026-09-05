import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

type AppSql = ReturnType<typeof getSql>;

const SCRYPT = { N: 16384, r: 16, p: 1 } as const;

function credentialKey(password: string, salt: string): Buffer {
  return scryptSync(password.normalize("NFKC"), salt, 64, {
    ...SCRYPT,
    maxmem: 128 * SCRYPT.N * SCRYPT.r * 2
  });
}

export function hashCredentialPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${credentialKey(password, salt).toString("hex")}`;
}

export function verifyCredentialPassword(hash: string, password: string): boolean {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  return credentialKey(password, salt).toString("hex") === key;
}

/**
 * Sets the Better Auth credential password (neon_auth.account) for a user.
 * Vault stays the source of truth for the original password; this keeps the
 * auth provider's hash in sync with it. Revokes all sessions for the user.
 */
export async function syncCredentialPassword(userId: string, plainPassword: string) {
  const sql = getSql();
  const hash = hashCredentialPassword(plainPassword);
  const result = await sql`
    update neon_auth.account
    set password = ${hash}, "updatedAt" = now()
    where "userId" = ${userId}::uuid and "providerId" = 'credential'
  `;
  if (result.count === 0) {
    await sql`
      insert into neon_auth.account ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      values (gen_random_uuid(), ${userId}, 'credential', ${userId}::uuid, ${hash}, now(), now())
    `;
  }
  await sql`delete from neon_auth.session where "userId" = ${userId}::uuid`;
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
