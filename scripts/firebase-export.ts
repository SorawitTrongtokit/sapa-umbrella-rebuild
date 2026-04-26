import { readFileSync } from "node:fs";

export type LegacyUserRecord = {
  legacyId: string;
  path: string;
  record: Record<string, unknown>;
};

export function loadFirebaseExport(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function discoverUsers(root: unknown): LegacyUserRecord[] {
  const users: LegacyUserRecord[] = [];

  function walk(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;

    if (typeof record.email === "string") {
      users.push({
        legacyId: path.split("/").filter(Boolean).at(-1) ?? record.email,
        path,
        record
      });
      return;
    }

    for (const [key, child] of Object.entries(record)) {
      walk(child, `${path}/${key}`);
    }
  }

  walk(root, "");
  return users;
}

export function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function getNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function redactRecord(record: Record<string, unknown>) {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (/password|token|secret|key/i.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      redacted[key] = "[OBJECT]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
