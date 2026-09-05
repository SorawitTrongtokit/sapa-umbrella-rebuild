import "./load-env";
import postgres, { type JSONValue } from "postgres";
import { hashCredentialPassword } from "../lib/credential-password";
import { requireEnv } from "../lib/env";
import { decryptPassword } from "../lib/password-vault";

type VaultSnapshot = { ciphertext: string; iv: string; auth_tag: string };

type LocationRow = { id: string; name_th: string; sort_order: number };

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  class_level: string | null;
  student_number: number | null;
  role: string;
  status: string;
  onboarding_completed: boolean;
  legacy_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileVaultRow = ProfileRow & VaultSnapshot;

type UmbrellaRow = {
  id: number;
  location_id: string;
  label: string;
  status: string;
  borrowed_by: string | null;
  borrowed_transaction_id: string | null;
  disabled_reason: string | null;
  metadata: unknown;
  version: number;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  umbrella_id: number;
  borrower_id: string;
  borrow_location_id: string;
  return_location_id: string | null;
  status: string;
  borrowed_at: string;
  returned_at: string | null;
  closed_by: string | null;
  close_reason: string | null;
  created_at: string;
  updated_at: string;
};

type FeedbackRow = {
  id: string;
  user_id: string;
  message: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

type AttemptRow = {
  id: string;
  attempt_key: string;
  email: string;
  ip: string | null;
  success: boolean;
  attempted_at: string;
};

type IdentityRow = { user_id: string; provider: string; provider_id: string };

const args = new Set(process.argv.slice(2));
const write = args.has("--write");

function envVal(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const supaUrl = envVal("SUPABASE_DATABASE_URL") ?? envVal("DATABASE_URL");
const neonUrl = envVal("NEON_DATABASE_URL_UNPOOLED");
const vaultKey = envVal("PASSWORD_VAULT_KEY");
if (!supaUrl) throw new Error("Missing SUPABASE_DATABASE_URL (source)");
if (!neonUrl) throw new Error("Missing NEON_DATABASE_URL_UNPOOLED");
if (!vaultKey) throw new Error("Missing PASSWORD_VAULT_KEY");
if (!envVal("OWNER_EMAIL")) throw new Error("Missing OWNER_EMAIL");

const supa = postgres(supaUrl!, { max: 1, prepare: false, connect_timeout: 60 });

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = Math.min(2, Math.max(1, local.length - 2));
  return `${local.slice(0, visible)}***@${domain}`;
}

async function main() {
  const locations = await supa<LocationRow[]>`
    select id, name_th, sort_order from public.locations order by sort_order
  `;
  const profiles = await supa<ProfileRow[]>`
    select * from public.profiles order by created_at
  `;
  const vaultRows = await supa<ProfileVaultRow[]>`
    select p.*, v.ciphertext, v.iv, v.auth_tag
    from public.profiles p
    join app_private.password_vault v on v.user_id = p.id
    order by p.created_at
  `;
  const identities = await supa<IdentityRow[]>`
    select user_id::text, provider, provider_id
    from auth.identities
    where provider <> 'email'
  `;
  const umbrellas = await supa<UmbrellaRow[]>`select * from public.umbrellas order by id`;
  const transactions = await supa<TransactionRow[]>`select * from public.borrow_transactions order by borrowed_at`;
  const feedbackRows = await supa<FeedbackRow[]>`select * from public.feedback order by created_at`;
  const auditRows = await supa<AuditRow[]>`select * from public.audit_logs order by created_at`;
  const attempts = await supa<AttemptRow[]>`select * from app_private.auth_attempts order by attempted_at`;

  console.log(`locations: ${locations.length}`);
  console.log(`profiles: ${profiles.length}`);
  console.log(`vault rows: ${vaultRows.length}`);
  console.log(`social identities: ${identities.length}`);
  console.log(`umbrellas: ${umbrellas.length}`);
  console.log(`transactions: ${transactions.length}`);
  console.log(`feedback: ${feedbackRows.length}`);
  console.log(`audit_logs: ${auditRows.length}`);
  console.log(`auth_attempts: ${attempts.length}`);
  console.log(`mode: ${write ? "WRITE (changes will be applied to Neon)" : "DRY RUN (no changes)"}`);
  console.log("============================================================");

  let decryptFailures = 0;
  for (const row of vaultRows) {
    try {
      const plain = decryptPassword(row as unknown as VaultSnapshot);
      if (!plain) throw new Error("empty plaintext");
    } catch (err) {
      decryptFailures += 1;
      console.error(`DECRYPT FAIL profile ${row.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (decryptFailures > 0) {
    throw new Error(`Aborting: ${decryptFailures} vault row(s) failed to decrypt.`);
  }
  console.log("vault decrypt check: all rows OK");

  const missingVaultProfiles = profiles.filter((p) => !vaultRows.some((v) => v.id === p.id));
  if (missingVaultProfiles.length > 0) {
    console.warn(
      `WARN: ${missingVaultProfiles.length} profile(s) without vault row: ${missingVaultProfiles.map((p) => p.id).join(", ")}`
    );
  }
  const orphanBorrowers = transactions.filter((t) => !profiles.some((p) => p.id === t.borrower_id));
  if (orphanBorrowers.length > 0) {
    console.warn(`WARN: ${orphanBorrowers.length} transaction(s) reference missing profiles`);
  }

  if (!write) {
    console.log("Dry run complete. Re-run with --write to apply.");
    return;
  }

  const neon = postgres(requireEnv("NEON_DATABASE_URL_UNPOOLED"), {
    max: 1,
    prepare: false,
    connect_timeout: 60
  });

  try {
    // -- locations
    for (const loc of locations) {
      await neon`
        insert into public.locations (id, name_th, sort_order)
        values (${loc.id}, ${loc.name_th}, ${loc.sort_order})
        on conflict (id) do update
        set name_th = excluded.name_th, sort_order = excluded.sort_order
      `;
    }
    console.log(`locations written: ${locations.length}`);

    // -- auth users (same UUIDs as Supabase so all FKs stay valid)
    for (const profile of profiles) {
      const neonRole = profile.role === "user" ? "user" : "admin";
      const banned = profile.status !== "active";
      await neon`
        insert into neon_auth."user" (id, name, email, "emailVerified", role, banned, "banReason", "createdAt", "updatedAt")
        values (
          ${profile.id}::uuid,
          ${profile.display_name ?? maskEmail(profile.email)},
          ${profile.email},
          true,
          ${neonRole},
          ${banned},
          ${banned ? "บัญชีถูกระงับโดยผู้ดูแล" : null},
          ${profile.created_at}::timestamptz,
          ${profile.updated_at}::timestamptz
        )
        on conflict (id) do update
        set name = excluded.name,
            email = excluded.email,
            "emailVerified" = true,
            role = excluded.role,
            banned = excluded.banned,
            "banReason" = excluded."banReason",
            "updatedAt" = excluded."updatedAt"
      `;

      // social identities (e.g. Google)
      const socials = identities.filter((i) => i.user_id === profile.id);
      for (const social of socials) {
        const [account] = await neon<{ id: string }[]>`
          select id from neon_auth.account where "userId" = ${profile.id}::uuid and "providerId" = ${social.provider}
        `;
        if (!account) {
          await neon`
            insert into neon_auth.account ("id", "accountId", "providerId", "userId", "createdAt", "updatedAt")
            values (gen_random_uuid(), ${social.provider_id}, ${social.provider}, ${profile.id}::uuid, now(), now())
          `;
        }
      }

      // credential password (hash of the vault plaintext)
      const vaultRow = vaultRows.find((v) => v.id === profile.id);
      if (vaultRow) {
        const plain = decryptPassword(vaultRow as unknown as VaultSnapshot);
        const [credAccount] = await neon<{ id: string }[]>`
          select id from neon_auth.account where "userId" = ${profile.id}::uuid and "providerId" = 'credential'
        `;
        if (!credAccount) {
          await neon`
            insert into neon_auth.account ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
            values (gen_random_uuid(), ${profile.id}, 'credential', ${profile.id}::uuid, ${hashCredentialPassword(plain)}, now(), now())
          `;
        } else {
          await neon`
            update neon_auth.account
            set password = ${hashCredentialPassword(plain)}, "updatedAt" = now()
            where id = ${credAccount.id}
          `;
        }
      }
    }
    console.log(`auth users synced: ${profiles.length}`);

    // -- profiles
    for (const profile of profiles) {
      await neon`
        insert into public.profiles (
          id, email, display_name, class_level, student_number,
          role, status, onboarding_completed, legacy_user_id, created_at, updated_at
        )
        values (
          ${profile.id}::uuid, ${profile.email}, ${profile.display_name}, ${profile.class_level}, ${profile.student_number},
          ${profile.role}::public.app_role, ${profile.status}::public.account_status, ${profile.onboarding_completed},
          ${profile.legacy_user_id}, ${profile.created_at}::timestamptz, ${profile.updated_at}::timestamptz
        )
        on conflict (id) do update
        set email = excluded.email,
            display_name = excluded.display_name,
            class_level = excluded.class_level,
            student_number = excluded.student_number,
            role = excluded.role,
            status = excluded.status,
            onboarding_completed = excluded.onboarding_completed,
            legacy_user_id = excluded.legacy_user_id,
            updated_at = excluded.updated_at
      `;
    }
    console.log(`profiles synced: ${profiles.length}`);

    // -- umbrellas
    for (const u of umbrellas) {
      await neon`
        insert into public.umbrellas (
          id, location_id, label, status, borrowed_by, borrowed_transaction_id,
          disabled_reason, metadata, version, created_at, updated_at
        )
        values (
          ${u.id}, ${u.location_id}, ${u.label}, ${u.status}::public.umbrella_status,
          ${u.borrowed_by}::uuid, ${u.borrowed_transaction_id}::uuid, ${u.disabled_reason},
          ${neon.json((u.metadata ?? {}) as postgres.JSONValue)}, ${u.version}, ${u.created_at}::timestamptz, ${u.updated_at}::timestamptz
        )
        on conflict (id) do update
        set location_id = excluded.location_id,
            label = excluded.label,
            status = excluded.status,
            borrowed_by = excluded.borrowed_by,
            borrowed_transaction_id = excluded.borrowed_transaction_id,
            disabled_reason = excluded.disabled_reason,
            metadata = excluded.metadata,
            version = excluded.version,
            updated_at = excluded.updated_at
      `;
    }
    console.log(`umbrellas synced: ${umbrellas.length}`);

    // -- borrow transactions
    for (const t of transactions) {
      await neon`
        insert into public.borrow_transactions (
          id, umbrella_id, borrower_id, borrow_location_id, return_location_id,
          status, borrowed_at, returned_at, closed_by, close_reason, created_at, updated_at
        )
        values (
          ${t.id}::uuid, ${t.umbrella_id}, ${t.borrower_id}::uuid, ${t.borrow_location_id}, ${t.return_location_id},
          ${t.status}::public.borrow_status, ${t.borrowed_at}::timestamptz, ${t.returned_at}::timestamptz,
          ${t.closed_by}::uuid, ${t.close_reason}, ${t.created_at}::timestamptz, ${t.updated_at}::timestamptz
        )
        on conflict (id) do update
        set umbrella_id = excluded.umbrella_id,
            borrower_id = excluded.borrower_id,
            borrow_location_id = excluded.borrow_location_id,
            return_location_id = excluded.return_location_id,
            status = excluded.status,
            borrowed_at = excluded.borrowed_at,
            returned_at = excluded.returned_at,
            closed_by = excluded.closed_by,
            close_reason = excluded.close_reason,
            updated_at = excluded.updated_at
      `;
    }
    console.log(`transactions synced: ${transactions.length}`);

    // -- feedback
    for (const f of feedbackRows) {
      await neon`
        insert into public.feedback (id, user_id, message, status, admin_note, created_at, updated_at)
        values (${f.id}::uuid, ${f.user_id}::uuid, ${f.message}, ${f.status}, ${f.admin_note}, ${f.created_at}::timestamptz, ${f.updated_at}::timestamptz)
        on conflict (id) do update
        set user_id = excluded.user_id,
            message = excluded.message,
            status = excluded.status,
            admin_note = excluded.admin_note,
            updated_at = excluded.updated_at
      `;
    }
    console.log(`feedback synced: ${feedbackRows.length}`);

    // -- audit logs
    for (const a of auditRows) {
      await neon`
        insert into public.audit_logs (
          id, actor_id, target_user_id, entity_type, entity_id,
          action, details, ip, user_agent, created_at
        )
        values (
          ${a.id}::uuid, ${a.actor_id}::uuid, ${a.target_user_id}::uuid, ${a.entity_type},
          ${a.entity_id}, ${a.action}, ${neon.json((a.details ?? {}) as postgres.JSONValue)}, ${a.ip}, ${a.user_agent},
          ${a.created_at}::timestamptz
        )
        on conflict (id) do update
        set details = excluded.details,
            ip = excluded.ip,
            user_agent = excluded.user_agent
      `;
    }
    console.log(`audit logs synced: ${auditRows.length}`);

    // -- vault (encrypted rows copied verbatim; same PASSWORD_VAULT_KEY)
    for (const v of vaultRows) {
      await neon`
        insert into app_private.password_vault (
          user_id, ciphertext, iv, auth_tag, key_version, source, changed_by, changed_at
        )
        values (
          ${v.id}::uuid, ${v.ciphertext}, ${v.iv}, ${v.auth_tag}, 'v1', 'legacy_migration',
          ${v.id}::uuid, ${v.updated_at}::timestamptz
        )
        on conflict (user_id) do update
        set ciphertext = excluded.ciphertext,
            iv = excluded.iv,
            auth_tag = excluded.auth_tag,
            changed_at = excluded.changed_at
      `;
    }
    console.log(`vault synced: ${vaultRows.length}`);

    // -- auth attempts
    for (const at of attempts) {
      await neon`
        insert into app_private.auth_attempts (id, attempt_key, email, ip, success, attempted_at)
        values (${at.id}::uuid, ${at.attempt_key}, ${at.email}, ${at.ip}, ${at.success}, ${at.attempted_at}::timestamptz)
        on conflict (id) do update
        set success = excluded.success
      `;
    }
    console.log(`auth attempts synced: ${attempts.length}`);

    // ================= verification =================
    console.log("============================================================");
    const neonCounts = await neon`
      select
        (select count(*) from public.locations)::int as locations,
        (select count(*) from public.profiles)::int as profiles,
        (select count(*) from public.umbrellas)::int as umbrellas,
        (select count(*) from public.borrow_transactions)::int as transactions,
        (select count(*) from public.feedback)::int as feedback,
        (select count(*) from public.audit_logs)::int as audit_logs,
        (select count(*) from neon_auth."user")::int as auth_users,
        (select count(*) from neon_auth.account where "providerId" = 'credential')::int as credentials,
        (select count(*) from app_private.password_vault)::int as vault
    `;
    console.log("Neon counts:", JSON.stringify(neonCounts[0]));

    // roundtrip: decrypt vault rows from Neon and confirm non-empty plaintexts
    const neonVault = await neon<(VaultSnapshot & { user_id: string })[]>`
      select user_id::text, ciphertext, iv, auth_tag from app_private.password_vault
    `;
    let roundtripFailures = 0;
    for (const row of neonVault) {
      try {
        if (!decryptPassword(row)) throw new Error("empty plaintext");
      } catch {
        roundtripFailures += 1;
        console.error(`ROUNDTRIP FAIL ${row.user_id}`);
      }
    }
    console.log(`vault roundtrip from Neon: ${neonVault.length - roundtripFailures}/${neonVault.length} OK`);

    const fkIssues = await neon`
      select
        (select count(*) from public.profiles p left join neon_auth."user" u on u.id = p.id where u.id is null)::int as profiles_without_user,
        (select count(*) from public.umbrellas ub left join neon_auth."user" bu on bu.id = ub.borrowed_by where ub.borrowed_by is not null and bu.id is null)::int as broken_borrowed_by,
        (select count(*) from public.borrow_transactions bt left join neon_auth."user" bu on bu.id = bt.borrower_id where bu.id is null)::int as orphan_transactions
    `;
    console.log("FK integrity:", JSON.stringify(fkIssues[0]));
  } finally {
    await neon.end();
  }
  console.log("Migration to Neon complete.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => supa.end());


