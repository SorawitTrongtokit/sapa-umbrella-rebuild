import test from "node:test";
import assert from "node:assert/strict";
import { isOwnerEmail, requireEnv } from "../lib/env";

test("requireEnv returns present values and throws for missing variables", () => {
  process.env.TEST_REQUIRED_ENV = "present";
  delete process.env.TEST_MISSING_ENV;

  assert.equal(requireEnv("TEST_REQUIRED_ENV"), "present");
  assert.throws(() => requireEnv("TEST_MISSING_ENV"), /Missing required environment variable/);
});

test("isOwnerEmail matches configured owner email case-insensitively", () => {
  process.env.OWNER_EMAIL = "Owner@Example.com";

  assert.equal(isOwnerEmail("owner@example.com"), true);
  assert.equal(isOwnerEmail("OWNER@EXAMPLE.COM"), true);
  assert.equal(isOwnerEmail("student@example.com"), false);
  assert.equal(isOwnerEmail(null), false);
});
