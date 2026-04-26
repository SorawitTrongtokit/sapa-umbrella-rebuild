import "dotenv/config";
import { discoverUsers, loadFirebaseExport, redactRecord } from "./firebase-export";
import { decryptLegacyPassword, findPasswordCandidate } from "./legacy-password";

const exportPath = process.argv[2] ?? "data/firebase-rtdb-export.json";
const key = process.env.LEGACY_PASSWORD_KEY ?? "PCSHSPL-2025-UMBRELLA-SYSTEM-SECURE-KEY-v1.0.0";
const root = loadFirebaseExport(exportPath);
const users = discoverUsers(root);

console.log(`Found ${users.length} candidate user records in ${exportPath}`);

for (const user of users.slice(0, 5)) {
  const candidate = findPasswordCandidate(user.record);
  const decrypted = candidate ? decryptLegacyPassword(candidate, key) : null;
  console.log(
    JSON.stringify(
      {
        path: user.path,
        legacyId: user.legacyId,
        sample: redactRecord(user.record),
        passwordDecrypts: Boolean(decrypted)
      },
      null,
      2
    )
  );
}

if (!users.length) {
  process.exitCode = 1;
}
