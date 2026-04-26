import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverPrimaryUsers,
  discoverUsers,
  getDisplayName,
  getNumber,
  getString,
  maskEmail,
  normalizeClassLevel,
  redactRecord
} from "../scripts/firebase-export";

test("discovers primary users and merges password records from userSecrets", () => {
  const users = discoverPrimaryUsers({
    activities: {
      a1: { userInfo: { email: "activity@example.com" } }
    },
    users: {
      uid1: {
        email: "student@example.com",
        grade: "5/1",
        studentNumber: "7"
      }
    },
    userSecrets: {
      uid1: {
        encryptedPassword: "encrypted-value"
      }
    }
  });

  assert.equal(users.length, 1);
  assert.equal(users[0].legacyId, "uid1");
  assert.equal(users[0].path, "/users/uid1");
  assert.equal(users[0].record.encryptedPassword, "encrypted-value");
});

test("falls back to generic discovery when primary users node is absent", () => {
  const users = discoverUsers({
    nested: {
      uid1: { email: "one@example.com" },
      ignored: { name: "No email" }
    }
  });

  assert.equal(users.length, 1);
  assert.equal(users[0].legacyId, "uid1");
});

test("extracts strings, numbers, display names, and normalized class levels", () => {
  const record = {
    email: " student@example.com ",
    number: "12",
    firstName: "Ada",
    lastName: "Lovelace"
  };

  assert.equal(getString(record, ["email"]), "student@example.com");
  assert.equal(getNumber(record, ["number"]), 12);
  assert.equal(getDisplayName(record), "Ada Lovelace");
  assert.match(normalizeClassLevel(" 5/2 ") ?? "", /5\/2$/);
  assert.equal(normalizeClassLevel(null), null);
});

test("redacts sensitive fields from inspection output", () => {
  const redacted = redactRecord({
    email: "student@example.com",
    phone: "0123456789",
    encryptedPassword: "secret",
    nested: { token: "secret" },
    grade: "5/2"
  });

  assert.equal(redacted.email, "st***@example.com");
  assert.equal(redacted.phone, "[REDACTED_PHONE]");
  assert.equal(redacted.encryptedPassword, "[REDACTED]");
  assert.equal(redacted.nested, "[OBJECT]");
  assert.equal(redacted.grade, "5/2");
  assert.equal(maskEmail("invalid"), "invalid");
});
