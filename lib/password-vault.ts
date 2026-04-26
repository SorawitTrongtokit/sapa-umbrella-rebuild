import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/lib/env";
import type { PasswordVaultRow } from "@/lib/types";

const ALGORITHM = "aes-256-gcm";

function getVaultKey(): Buffer {
  return createHash("sha256").update(requireEnv("PASSWORD_VAULT_KEY"), "utf8").digest();
}

export function encryptPassword(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getVaultKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptPassword(row: Pick<PasswordVaultRow, "ciphertext" | "iv" | "auth_tag">): string {
  const decipher = createDecipheriv(ALGORITHM, getVaultKey(), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, "base64")),
    decipher.final()
  ]);
  return plain.toString("utf8");
}

export function assertPasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข");
  }
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
