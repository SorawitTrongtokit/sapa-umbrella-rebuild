import test from "node:test";
import assert from "node:assert/strict";
import { HttpError, jsonBadRequest, jsonError } from "../lib/http";

test("jsonError preserves explicit HTTP errors", async () => {
  const response = jsonError(new HttpError(403, "forbidden"));
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.deepEqual(payload, { ok: false, error: "forbidden" });
});

test("jsonBadRequest returns a 400 response", async () => {
  const response = jsonBadRequest("bad input");
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(payload, { ok: false, error: "bad input" });
});

test("jsonError does not expose raw server error messages", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const response = jsonError(new Error("database detail should not leak"));
    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(payload, { ok: false, error: "เกิดข้อผิดพลาด" });
  } finally {
    console.error = originalConsoleError;
  }
});

test("jsonError treats malformed JSON syntax as a bad request", async () => {
  const response = jsonError(new SyntaxError("Unexpected end of JSON input"));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(payload, { ok: false, error: "ข้อมูล JSON ไม่ถูกต้อง" });
});
