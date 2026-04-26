import "./load-env";
import {
  discoverPrimaryUsers,
  getNumber,
  getString,
  loadFirebaseExport,
  maskEmail,
  normalizeClassLevel,
  redactRecord
} from "./firebase-export";
import { decryptLegacyPassword, findPasswordCandidate } from "./legacy-password";

const exportPath = process.argv[2] ?? "data/firebase-rtdb-export.json";
const key = process.env.LEGACY_PASSWORD_KEY;
if (!key) {
  throw new Error("Missing LEGACY_PASSWORD_KEY. Set it in .env.local before inspecting Firebase exports.");
}
const root = loadFirebaseExport(exportPath);
const users = discoverPrimaryUsers(root);

let decryptOk = 0;
let decryptBad = 0;
const roles = new Map<string, number>();
const classes = new Map<string, number>();
const invalid: Array<Record<string, unknown>> = [];

for (const user of users) {
  const candidate = findPasswordCandidate(user.record);
  const decrypted = candidate ? decryptLegacyPassword(candidate, key) : null;
  if (decrypted) decryptOk += 1;
  else decryptBad += 1;

  const role = getString(user.record, ["role"]) ?? "user";
  roles.set(role, (roles.get(role) ?? 0) + 1);

  const classLevel = normalizeClassLevel(getString(user.record, ["classLevel", "class", "grade", "room"]));
  if (classLevel) classes.set(classLevel, (classes.get(classLevel) ?? 0) + 1);

  const studentNumber = getNumber(user.record, ["studentNumber", "number", "no"]);
  const email = getString(user.record, ["email", "mail"]);
  if (!email || !classLevel || !studentNumber || !decrypted) {
    invalid.push({
      path: user.path,
      email: maskEmail(email),
      hasClass: Boolean(classLevel),
      studentNumber,
      passwordDecrypts: Boolean(decrypted)
    });
  }
}

console.log(`Found ${users.length} primary user records in ${exportPath}`);
console.log(`Password decrypt: ok=${decryptOk}, failed=${decryptBad}`);
console.log("Roles:", Object.fromEntries([...roles.entries()].sort()));
console.log("Classes:", Object.fromEntries([...classes.entries()].sort()));
console.log("Invalid or incomplete users:", invalid);
console.log(
  "Redacted samples:",
  JSON.stringify(
    users.slice(0, 3).map((user) => ({
      path: user.path,
      legacyId: user.legacyId,
      sample: redactRecord(user.record)
    })),
    null,
    2
  )
);

if (!users.length) {
  process.exitCode = 1;
}
