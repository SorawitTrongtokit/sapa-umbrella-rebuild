import { readFileSync } from "node:fs";

export type LegacyUserRecord = {
  legacyId: string;
  path: string;
  record: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

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

export function discoverPrimaryUsers(root: unknown): LegacyUserRecord[] {
  if (!isRecord(root) || !isRecord(root.users)) return discoverUsers(root);

  const secrets = isRecord(root.userSecrets) ? root.userSecrets : {};
  return Object.entries(root.users)
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .map(([uid, user]) => {
      const secret = isRecord(secrets[uid]) ? secrets[uid] : {};
      return {
        legacyId: uid,
        path: `/users/${uid}`,
        record: {
          ...user,
          encryptedPassword: user.encryptedPassword ?? secret.encryptedPassword
        }
      };
    });
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

export function normalizeClassLevel(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, "");
  const fixedThai = trimmed.replace(/^เธก\.?/u, "ม.");
  if (/^[1-6]\//.test(fixedThai)) return `ม.${fixedThai}`;
  if (/^ม[1-6]\//u.test(fixedThai)) return fixedThai.replace(/^ม/u, "ม.");
  return fixedThai;
}

export function getDisplayName(record: Record<string, unknown>) {
  const explicitName = getString(record, ["name", "displayName", "fullName"]);
  if (explicitName) return explicitName;

  const firstName = getString(record, ["firstName", "firstname"]);
  const lastName = getString(record, ["lastName", "lastname"]);
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return email ?? null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export function redactRecord(record: Record<string, unknown>) {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (/password|token|secret|key/i.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (/email/i.test(key) && typeof value === "string") {
      redacted[key] = maskEmail(value);
    } else if (/phone/i.test(key)) {
      redacted[key] = "[REDACTED_PHONE]";
    } else if (value && typeof value === "object") {
      redacted[key] = "[OBJECT]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
