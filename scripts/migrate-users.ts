import "./load-env";
import { z } from "zod";
import postgres from "postgres";
import { hashCredentialPassword } from "../lib/credential-password";
import { requireEnv } from "../lib/env";
import { encryptPassword } from "../lib/password-vault";
import {
  discoverPrimaryUsers,
  getDisplayName,
  getNumber,
  getString,
  loadFirebaseExport,
  normalizeClassLevel
} from "./firebase-export";
import { decryptLegacyPassword, findPasswordCandidate } from "./legacy-password";
import { maskEmail } from "./firebase-export";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const exportPath = process.argv.find((arg) => arg.endsWith(".json")) ?? "data/firebase-rtdb-export.json";
const legacyKey = process.env.LEGACY_PASSWORD_KEY;
if (!legacyKey) {
  throw new Error("Missing LEGACY_PASSWORD_KEY. Set it in .env.local before migrating.");
}

const emailSchema = z.string().email();
const root = loadFirebaseExport(exportPath);
const users = discoverPrimaryUsers(root);
const sql = write ? postgres(requireEnv("NEON_DATABASE_URL_UNPOOLED"), { max: 1, prepare: false }) : null;

let ready = 0;
let skipped = 0;
let imported = 0;

for (const user of users) {
  const emailCandidate = getString(user.record, ["email", "mail"]);
  const email = emailCandidate ? emailSchema.safeParse(emailCandidate.toLowerCase()) : null;
  const classLevel = normalizeClassLevel(getString(user.record, ["classLevel", "class", "grade", "room"]));
  const studentNumber = getNumber(user.record, ["studentNumber", "number", "no"]);
  const passwordCandidate = findPasswordCandidate(user.record);
  const plainPassword = passwordCandidate ? decryptLegacyPassword(passwordCandidate, legacyKey) : null;
  const roleCandidate = getString(user.record, ["role"]);
  const role = roleCandidate === "admin" || roleCandidate === "owner" ? roleCandidate : "user";
  const statusCandidate = getString(user.record, ["status", "accountStatus"]);
  const status = statusCandidate === "suspended" ? "suspended" : "active";
  const displayName = getDisplayName(user.record);

  if (!email?.success || !classLevel || !studentNumber || !plainPassword) {
    skipped += 1;
    console.log(`SKIP ${user.path}: missing email/class/number/password (${maskEmail(emailCandidate)})`);
    continue;
  }

  ready += 1;
  console.log(`READY ${maskEmail(email.data)} class=${classLevel} number=${studentNumber} role=${role}`);

  if (!write) continue;
  if (!sql) throw new Error("Database client was not initialized");

  const neonRole = role === "user" ? "user" : "admin";
  const [authUser] = await sql`
    insert into neon_auth."user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    values (gen_random_uuid(), ${displayName ?? email.data}, ${email.data}, true, ${neonRole}, now(), now())
    on conflict (email) do update
      set role = excluded.role,
          "emailVerified" = true,
          "updatedAt" = now()
    returning id
  `;
  const userId = authUser.id;

  const [account] = await sql`
    select id from neon_auth.account where "userId" = ${userId} and "providerId" = 'credential'
  `;
  if (!account) {
    await sql`
      insert into neon_auth.account ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      values (gen_random_uuid(), ${userId}, 'credential', ${userId}, ${hashCredentialPassword(plainPassword)}, now(), now())
    `;
  } else {
    await sql`
      update neon_auth.account
      set password = ${hashCredentialPassword(plainPassword)}, "updatedAt" = now()
      where id = ${account.id}
    `;
  }

  const encrypted = encryptPassword(plainPassword);
  await sql.begin(async (tx) => {
    await tx`
      insert into public.profiles (
        id,
        email,
        display_name,
        class_level,
        student_number,
        role,
        status,
        onboarding_completed,
        legacy_user_id
      )
      values (
        ${userId},
        ${email.data},
        ${displayName},
        ${classLevel},
        ${studentNumber},
        ${role},
        ${status},
        true,
        ${user.legacyId}
      )
      on conflict (id) do update
      set display_name = excluded.display_name,
          class_level = excluded.class_level,
          student_number = excluded.student_number,
          role = excluded.role,
          status = excluded.status,
          onboarding_completed = true,
          legacy_user_id = excluded.legacy_user_id
    `;
    await tx`
      insert into app_private.password_vault (
        user_id,
        ciphertext,
        iv,
        auth_tag,
        source
      )
      values (
        ${userId},
        ${encrypted.ciphertext},
        ${encrypted.iv},
        ${encrypted.authTag},
        'legacy_migration'
      )
      on conflict (user_id) do update
      set ciphertext = excluded.ciphertext,
          iv = excluded.iv,
          auth_tag = excluded.auth_tag,
          source = excluded.source,
          changed_at = now()
    `;
  });

  imported += 1;
}

await sql?.end();

console.log(
  `${write ? "Migration complete" : "Dry run complete"}: ready=${ready}, imported=${imported}, skipped=${skipped}`
);
if (!write) {
  console.log("Run with --write after reviewing the dry-run output.");
}
