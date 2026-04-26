import test from "node:test";
import assert from "node:assert/strict";
import { decryptPassword, encryptPassword } from "../lib/password-vault";

test("encrypts and decrypts password vault entries", () => {
  process.env.PASSWORD_VAULT_KEY = "test-vault-key";
  const encrypted = encryptPassword("Student12345");
  const decrypted = decryptPassword({
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag
  });

  assert.equal(decrypted, "Student12345");
  assert.notEqual(encrypted.ciphertext, "Student12345");
});
