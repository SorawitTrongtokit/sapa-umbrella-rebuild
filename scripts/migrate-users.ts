import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseCompatiblePassword } from "../lib/auth-password";
import { getSql } from "../lib/db";
import { requireEnv } from "../lib/env";
import { encryptPassword } from "../lib/password-vault";
import {
  discoverPrimaryUsers,
  getDisplayName,
  getNumber,
  getString,
  loadFirebaseExport,
  maskEmail,
  normalizeClassLevel
} from "./firebase-export";
import { decryptLegacyPassword, findPasswordCandidate } from "./legacy-password";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const exportPath = process.argv.find((arg) => arg.endsWith(".json")) ?? "data/firebase-rtdb-export.json";
const legacyKey = process.env.LEGACY_PASSWORD_KEY;
if (!legacyKey) {
  throw new Error("Missing LEGACY_PASSWORD_KEY. Set it in .env.local before migrating Firebase users.");
}

const emailSchema = z.string().email();
const root = loadFirebaseExport(exportPath);
const users = discoverPrimaryUsers(root);
const supabase = write
  ? createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;
const sql = write ? getSql() : null;

async function findAuthUserIdByEmail(email: string) {
  if (!sql) return null;
  const [existing] = await sql<{ id: string }[]>`
    select id::text
    from auth.users
    where lower(email) = lower(${email})
    limit 1
  `;
  return existing?.id ?? null;
}

let ready = 0;
let skipped = 0;
let imported = 0;
let adjustedAuthPasswords = 0;

for (const user of users) {
  const emailCandidate = getString(user.record, ["email", "mail"]);
  const email = emailCandidate ? emailSchema.safeParse(emailCandidate.toLowerCase()) : null;
  const classLevel = normalizeClassLevel(getString(user.record, ["classLevel", "class", "grade", "room"]));
  const studentNumber = getNumber(user.record, ["studentNumber", "number", "no"]);
  const passwordCandidate = findPasswordCandidate(user.record);
  const plainPassword = passwordCandidate ? decryptLegacyPassword(passwordCandidate, legacyKey) : null;
  const roleCandidate = getString(user.record, ["role"]);
  const role = roleCandidate === "admin" || roleCandidate === "owner" ? roleCandidate : "user";
  const statusCandidate = getString(user.record, ["status", "accountStatus"]);
  const status = statusCandidate === "suspended" ? "suspended" : "active";
  const displayName = getDisplayName(user.record);

  if (!email?.success || !classLevel || !studentNumber || !plainPassword) {
    skipped += 1;
    console.log(`SKIP ${user.path}: missing email/class/number/password (${maskEmail(emailCandidate)})`);
    continue;
  }

  ready += 1;
  const authPassword = getSupabaseCompatiblePassword(plainPassword, email.data, user.legacyId);
  if (authPassword.adjusted) adjustedAuthPasswords += 1;

  console.log(
    `READY ${maskEmail(email.data)} class=${classLevel} number=${studentNumber} role=${role}${
      authPassword.adjusted ? " authPasswordAdjusted=true" : ""
    }`
  );

  if (!write) continue;
  if (!supabase) throw new Error("Supabase client was not initialized");

  const { data, error } = await supabase.auth.admin.createUser({
    email: email.data,
    password: authPassword.password,
    email_confirm: true,
    app_metadata: { role }
  });

  let userId = data.user?.id ?? null;
  if (error) {
    userId = await findAuthUserIdByEmail(email.data);
    if (!userId) {
      throw new Error(`${email.data}: ${error.message}`);
    }
  }

  if (!userId) {
    console.log(`WARN ${maskEmail(email.data)}: user id not found; skipping profile write`);
    continue;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: authPassword.password,
    email_confirm: true,
    app_metadata: { role }
  });
  if (updateError) {
    throw new Error(`${email.data}: ${updateError.message}`);
  }

  const encrypted = encryptPassword(plainPassword);
  if (!sql) throw new Error("Database client was not initialized");
  await sql.begin(async (tx) => {
    await tx`
      insert into public.profiles (
        id,
        email,
        display_name,
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
        ${displayName},
        ${classLevel},
        ${studentNumber},
        ${role},
        ${status},
        true,
        ${user.legacyId}
      )
      on conflict (id) do update
      set display_name = excluded.display_name,
          class_level = excluded.class_level,
          student_number = excluded.student_number,
          role = excluded.role,
          status = excluded.status,
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

  imported += 1;
}

console.log(
  `${write ? "Migration complete" : "Dry run complete"}: ready=${ready}, imported=${imported}, skipped=${skipped}, authPasswordAdjusted=${adjustedAuthPasswords}`
);
if (!write) {
  console.log("Run with --write after reviewing the dry-run output.");
}
