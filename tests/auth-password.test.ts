import test from "node:test";
import assert from "node:assert/strict";
import { hashCredentialPassword, verifyCredentialPassword } from "../lib/credential-password";

test("hashes and verifies a credential password", () => {
  const hash = hashCredentialPassword("รหัสผ่าน1234");

  assert.equal(hash.split(":").length, 2);
  assert.equal(hash.split(":")[0].length, 32);
  assert.equal(hash.split(":")[1].length, 128);
  assert.equal(verifyCredentialPassword(hash, "รหัสผ่าน1234"), true);
  assert.equal(verifyCredentialPassword(hash, "ผิดรหัส5678"), false);
});

test("produces a unique salt for every hash", () => {
  const first = hashCredentialPassword("same-password-1");
  const second = hashCredentialPassword("same-password-1");

  assert.notEqual(first, second);
  assert.equal(verifyCredentialPassword(second, "same-password-1"), true);
});
