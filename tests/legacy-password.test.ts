import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import CryptoJS from "crypto-js";
import { decryptLegacyPassword, findPasswordCandidate } from "../scripts/legacy-password";

const LEGACY_KEY = "test-legacy-key";

test("decrypts CryptoJS AES legacy password strings", () => {
  const encrypted = CryptoJS.AES.encrypt("LegacyPass123", LEGACY_KEY).toString();

  assert.equal(decryptLegacyPassword(encrypted, LEGACY_KEY), "LegacyPass123");
  assert.equal(decryptLegacyPassword(encrypted, "wrong-key"), null);
});

test("decrypts structured AES-GCM legacy password records", () => {
  const iv = randomBytes(12);
  const key = createHash("sha256").update(LEGACY_KEY, "utf8").digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update("StructuredPass123", "utf8"), cipher.final()]);

  const decrypted = decryptLegacyPassword(
    {
      algorithm: "aes-256-gcm",
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64")
    },
    LEGACY_KEY
  );

  assert.equal(decrypted, "StructuredPass123");
});

test("does not treat malformed encrypted-looking strings as plaintext", () => {
  assert.equal(decryptLegacyPassword("U2FsdGVkX1-not-valid", LEGACY_KEY), null);
  assert.equal(decryptLegacyPassword("header.payload.signature", LEGACY_KEY), null);
});

test("finds known password candidate fields", () => {
  const structured = findPasswordCandidate({ passwordVault: { ciphertext: "abc" } });

  assert.equal(findPasswordCandidate({ encryptedPassword: "encrypted" }), "encrypted");
  assert.equal(typeof structured === "object" && structured !== null ? structured.ciphertext : null, "abc");
  assert.equal(findPasswordCandidate({ noPassword: true }), null);
});
