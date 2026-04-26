import test from "node:test";
import assert from "node:assert/strict";
import {
  auditReasonSchema,
  feedbackSchema,
  passwordSchema,
  profileSchema,
  registerSchema,
  studentNumberSchema
} from "../lib/validation";

test("accepts valid registration and coerces student number", () => {
  const result = registerSchema.parse({
    email: " student@example.com ",
    classLevel: "M5/1",
    studentNumber: "12",
    password: "Student123"
  });

  assert.equal(result.email, "student@example.com");
  assert.equal(result.studentNumber, 12);
});

test("rejects invalid registration inputs", () => {
  assert.equal(registerSchema.safeParse({ email: "bad", classLevel: "M5", studentNumber: 1, password: "Student123" }).success, false);
  assert.equal(registerSchema.safeParse({ email: "ok@example.com", classLevel: "", studentNumber: 1, password: "Student123" }).success, false);
  assert.equal(registerSchema.safeParse({ email: "ok@example.com", classLevel: "M5", studentNumber: 100, password: "Student123" }).success, false);
  assert.equal(registerSchema.safeParse({ email: "ok@example.com", classLevel: "M5", studentNumber: 1, password: "short" }).success, false);
});

test("validates profile, feedback, password, and audit reason limits", () => {
  assert.equal(profileSchema.safeParse({ displayName: null, classLevel: "M5/1", studentNumber: "4" }).success, true);
  assert.equal(studentNumberSchema.safeParse("0").success, false);
  assert.equal(feedbackSchema.safeParse({ message: "ok" }).success, false);
  assert.equal(feedbackSchema.safeParse({ message: "good feedback" }).success, true);
  assert.equal(passwordSchema.safeParse({ password: "1234567" }).success, false);
  assert.equal(passwordSchema.safeParse({ password: "12345678" }).success, true);
  assert.equal(auditReasonSchema.safeParse({ reason: "ok" }).success, false);
  assert.equal(auditReasonSchema.safeParse({ reason: "valid reason" }).success, true);
});
