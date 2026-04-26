import { createDecipheriv, createHash } from "node:crypto";
import CryptoJS from "crypto-js";

type LegacyPasswordCandidate =
  | string
  | {
      algorithm?: string;
      ciphertext?: string;
      encrypted?: string;
      iv?: string;
      tag?: string;
      authTag?: string;
      encoding?: "base64" | "hex";
    };

function sha256Key(key: string) {
  return createHash("sha256").update(key, "utf8").digest();
}

function decode(value: string, encoding: "base64" | "hex" = "base64") {
  return Buffer.from(value, encoding);
}

export function decryptLegacyPassword(candidate: LegacyPasswordCandidate, key: string): string | null {
  if (!candidate) return null;

  if (typeof candidate === "string") {
    const cryptoJsPlain = CryptoJS.AES.decrypt(candidate, key).toString(CryptoJS.enc.Utf8);
    if (cryptoJsPlain) return cryptoJsPlain;
    return candidate.length >= 8 && candidate.length <= 128 ? candidate : null;
  }

  const ciphertext = candidate.ciphertext ?? candidate.encrypted;
  const iv = candidate.iv;
  if (!ciphertext || !iv) return null;

  const encoding = candidate.encoding ?? "base64";
  const algorithm = candidate.algorithm?.toLowerCase() ?? (candidate.tag || candidate.authTag ? "aes-256-gcm" : "aes-256-cbc");

  try {
    if (algorithm.includes("gcm")) {
      const tag = candidate.tag ?? candidate.authTag;
      if (!tag) return null;
      const decipher = createDecipheriv("aes-256-gcm", sha256Key(key), decode(iv, encoding));
      decipher.setAuthTag(decode(tag, encoding));
      return Buffer.concat([decipher.update(decode(ciphertext, encoding)), decipher.final()]).toString("utf8");
    }

    const decipher = createDecipheriv("aes-256-cbc", sha256Key(key), decode(iv, encoding));
    return Buffer.concat([decipher.update(decode(ciphertext, encoding)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function findPasswordCandidate(record: Record<string, unknown>): LegacyPasswordCandidate | null {
  const keys = [
    "password",
    "encryptedPassword",
    "passwordEncrypted",
    "legacyPassword",
    "password_ciphertext",
    "passwordCiphertext"
  ];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }

  if (typeof record.passwordVault === "object" && record.passwordVault) {
    return record.passwordVault as LegacyPasswordCandidate;
  }
  if (typeof record.passwordData === "object" && record.passwordData) {
    return record.passwordData as LegacyPasswordCandidate;
  }

  return null;
}
