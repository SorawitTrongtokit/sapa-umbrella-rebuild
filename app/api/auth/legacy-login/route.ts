import { type NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSupabaseCompatiblePassword } from "@/lib/auth-password";
import { getSql } from "@/lib/db";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { constantTimeEquals, decryptPassword } from "@/lib/password-vault";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import type { AppRole, AccountStatus } from "@/lib/types";

const legacyLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

type LegacyLoginRow = {
  id: string;
  email: string;
  role: AppRole;
  status: AccountStatus;
  legacy_user_id: string | null;
  ciphertext: string;
  iv: string;
  auth_tag: string;
};

const MAX_FAILED_ATTEMPTS = 5;

function legacyAttemptKey(email: string, ip: string | null) {
  return `${ip ?? "unknown"}:${email.toLowerCase()}`;
}

async function assertLegacyLoginAllowed(sql: ReturnType<typeof getSql>, attemptKey: string) {
  const [row] = await sql<{ attempts: number }[]>`
    select count(*)::int as attempts
    from app_private.auth_attempts
    where attempt_key = ${attemptKey}
      and success = false
      and attempted_at > now() - interval '10 minutes'
  `;

  if ((row?.attempts ?? 0) >= MAX_FAILED_ATTEMPTS) {
    throw new HttpError(429, "ลองใหม่ภายหลัง");
  }
}

async function recordLegacyLoginAttempt(
  sql: ReturnType<typeof getSql>,
  attemptKey: string,
  email: string,
  ip: string | null,
  success: boolean
) {
  if (success) {
    await sql`
      delete from app_private.auth_attempts
      where attempt_key = ${attemptKey}
        and success = false
    `;
  }

  await sql`
    insert into app_private.auth_attempts (attempt_key, email, ip, success)
    values (${attemptKey}, ${email.toLowerCase()}, ${ip}, ${success})
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = legacyLoginSchema.parse(await request.json());
    const meta = requestMeta(request);
    const attemptKey = legacyAttemptKey(body.email, meta.ip);
    const sql = getSql();
    await assertLegacyLoginAllowed(sql, attemptKey);

    const [row] = await sql<LegacyLoginRow[]>`
      select
        p.id::text,
        p.email::text,
        p.role,
        p.status,
        p.legacy_user_id,
        v.ciphertext,
        v.iv,
        v.auth_tag
      from public.profiles p
      join app_private.password_vault v on v.user_id = p.id
      where lower(p.email::text) = lower(${body.email})
      limit 1
    `;

    if (!row) {
      await recordLegacyLoginAttempt(sql, attemptKey, body.email, meta.ip, false);
      throw new HttpError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    if (row.status !== "active") {
      await recordLegacyLoginAttempt(sql, attemptKey, body.email, meta.ip, false);
      throw new HttpError(403, "บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแล");
    }

    const legacyPassword = decryptPassword(row);
    if (!constantTimeEquals(legacyPassword, body.password)) {
      await recordLegacyLoginAttempt(sql, attemptKey, body.email, meta.ip, false);
      throw new HttpError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const authPassword = getSupabaseCompatiblePassword(legacyPassword, row.email, row.legacy_user_id ?? row.id);
    const service = createSupabaseServiceClient();
    const { error: updateError } = await service.auth.admin.updateUserById(row.id, {
      password: authPassword.password,
      app_metadata: { role: row.role }
    });
    if (updateError) throw new Error(updateError.message);

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: row.email,
      password: authPassword.password
    });
    if (signInError) {
      await recordLegacyLoginAttempt(sql, attemptKey, body.email, meta.ip, false);
      throw new HttpError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    await recordLegacyLoginAttempt(sql, attemptKey, body.email, meta.ip, true);
    await writeAuditLog({
      actorId: row.id,
      targetUserId: row.id,
      entityType: "user",
      entityId: row.id,
      action: "auth.legacy_login",
      details: { authPasswordAdjusted: authPassword.adjusted },
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk({ userId: row.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
