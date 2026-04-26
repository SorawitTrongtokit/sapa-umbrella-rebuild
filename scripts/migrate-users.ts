import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSql } from "../lib/db";
import { requireEnv } from "../lib/env";
import { encryptPassword } from "../lib/password-vault";
import { discoverUsers, getNumber, getString, loadFirebaseExport } from "./firebase-export";
import { decryptLegacyPassword, findPasswordCandidate } from "./legacy-password";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const exportPath = process.argv.find((arg) => arg.endsWith(".json")) ?? "data/firebase-rtdb-export.json";
const legacyKey = process.env.LEGACY_PASSWORD_KEY ?? "PCSHSPL-2025-UMBRELLA-SYSTEM-SECURE-KEY-v1.0.0";

const emailSchema = z.string().email();
const root = loadFirebaseExport(exportPath);
const users = discoverUsers(root);

const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

let ready = 0;
let skipped = 0;

for (const user of users) {
  const emailCandidate = getString(user.record, ["email", "mail"]);
  const email = emailCandidate ? emailSchema.safeParse(emailCandidate.toLowerCase()) : null;
  const classLevel = getString(user.record, ["classLevel", "class", "grade", "room", "ชั้น"]);
  const studentNumber = getNumber(user.record, ["studentNumber", "number", "no", "เลขที่"]);
  const passwordCandidate = findPasswordCandidate(user.record);
  const plainPassword = passwordCandidate ? decryptLegacyPassword(passwordCandidate, legacyKey) : null;

  if (!email?.success || !classLevel || !studentNumber || !plainPassword) {
    skipped += 1;
    console.log(`SKIP ${user.path}: missing email/class/number/password`);
    continue;
  }

  ready += 1;
  console.log(`READY ${email.data} class=${classLevel} number=${studentNumber}`);

  if (!write) continue;

  const { data, error } = await supabase.auth.admin.createUser({
    email: email.data,
    password: plainPassword,
    email_confirm: true,
    app_metadata: { role: "user" }
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    throw new Error(`${email.data}: ${error.message}`);
  }

  const userId = data.user?.id;
  if (!userId) {
    console.log(`WARN ${email.data}: user may already exist; skipping profile write`);
    continue;
  }

  const encrypted = encryptPassword(plainPassword);
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      insert into public.profiles (
        id,
        email,
        class_level,
        student_number,
        role,
        status,
        onboarding_completed,
        legacy_user_id
      )
      values (
        ${userId},
        ${email.data},
        ${classLevel},
        ${studentNumber},
        'user',
        'active',
        true,
        ${user.legacyId}
      )
      on conflict (id) do update
      set class_level = excluded.class_level,
          student_number = excluded.student_number,
          onboarding_completed = true,
          legacy_user_id = excluded.legacy_user_id
    `;
    await tx`
      insert into app_private.password_vault (
        user_id,
        ciphertext,
        iv,
        auth_tag,
        source
      )
      values (
        ${userId},
        ${encrypted.ciphertext},
        ${encrypted.iv},
        ${encrypted.authTag},
        'legacy_migration'
      )
      on conflict (user_id) do update
      set ciphertext = excluded.ciphertext,
          iv = excluded.iv,
          auth_tag = excluded.auth_tag,
          source = excluded.source,
          changed_at = now()
    `;
  });
}

console.log(`${write ? "Migration complete" : "Dry run complete"}: ready=${ready}, skipped=${skipped}`);
if (!write) {
  console.log("Run with --write after reviewing the dry-run output.");
}
