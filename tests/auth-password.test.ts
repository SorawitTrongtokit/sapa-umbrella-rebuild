import test from "node:test";
import assert from "node:assert/strict";
import { getSupabaseCompatiblePassword } from "../lib/auth-password";

test("keeps legacy passwords that already satisfy Supabase minimum length", () => {
  const result = getSupabaseCompatiblePassword("abcdef", "student@example.com", "uid-1");

  assert.equal(result.password, "abcdef");
  assert.equal(result.adjusted, false);
});

test("derives deterministic compatible passwords for short legacy passwords", () => {
  const first = getSupabaseCompatiblePassword("1234", "student@example.com", "uid-1");
  const second = getSupabaseCompatiblePassword("1234", "student@example.com", "uid-1");
  const otherUser = getSupabaseCompatiblePassword("1234", "other@example.com", "uid-2");

  assert.equal(first.adjusted, true);
  assert.equal(first.password.length > 8, true);
  assert.equal(first.password, second.password);
  assert.notEqual(first.password, "1234");
  assert.notEqual(first.password, otherUser.password);
});
