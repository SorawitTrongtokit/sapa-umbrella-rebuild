import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPasswordStrength,
  constantTimeEquals,
  decryptPassword,
  encryptPassword
} from "../lib/password-vault";

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

test("uses authenticated encryption so the wrong key cannot decrypt", () => {
  process.env.PASSWORD_VAULT_KEY = "test-vault-key";
  const encrypted = encryptPassword("Student12345");

  process.env.PASSWORD_VAULT_KEY = "different-vault-key";
  assert.throws(() =>
    decryptPassword({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag
    })
  );
});

test("validates password strength for app-created passwords", () => {
  assert.doesNotThrow(() => assertPasswordStrength("Student12345"));
  assert.throws(() => assertPasswordStrength("short1"));
  assert.throws(() => assertPasswordStrength("NoDigitsHere"));
  assert.throws(() => assertPasswordStrength("1234567890"));
});

test("compares password strings without accepting length mismatches", () => {
  assert.equal(constantTimeEquals("same-password", "same-password"), true);
  assert.equal(constantTimeEquals("same-password", "different"), false);
  assert.equal(constantTimeEquals("short", "shorter"), false);
});
