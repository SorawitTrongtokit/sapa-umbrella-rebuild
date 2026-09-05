import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { syncCredentialPassword } from "@/lib/credential-password";
import { getSql } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { passwordSchema } from "@/lib/validation";

const updatePasswordSchema = passwordSchema.extend({
  token: z.string().trim().min(1).optional()
});

type ResetPasswordResponse = {
  user?: { id?: string };
  message?: string;
  code?: string;
};

async function resetPasswordWithToken(token: string, newPassword: string): Promise<ResetPasswordResponse> {
  const response = await fetch(`${requireEnv("NEON_AUTH_BASE_URL").replace(/\/$/, "")}/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newPassword, token })
  });
  const payload = (await response.json().catch(() => ({}))) as ResetPasswordResponse;
  if (!response.ok) {
    throw new Error(payload.message || "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ");
  }
  return payload;
}

async function upsertVaultAndAudit(
  userId: string,
  actorId: string,
  password: string,
  action: string,
  meta: { ip: string | null; userAgent: string | null }
) {
  const encrypted = encryptPassword(password);
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      insert into app_private.password_vault (
        user_id,
        ciphertext,
        iv,
        auth_tag,
        source,
        changed_by
      )
      values (
        ${userId}::uuid,
        ${encrypted.ciphertext},
        ${encrypted.iv},
        ${encrypted.authTag},
        'app',
        ${actorId}::uuid
      )
      on conflict (user_id) do update
      set ciphertext = excluded.ciphertext,
          iv = excluded.iv,
          auth_tag = excluded.auth_tag,
          source = excluded.source,
          changed_by = excluded.changed_by,
          changed_at = now()
    `;

    await tx`
      insert into public.audit_logs (
        actor_id,
        target_user_id,
        entity_type,
        entity_id,
        action,
        details,
        ip,
        user_agent
      )
      values (
        ${actorId}::uuid,
        ${userId}::uuid,
        'user',
        ${userId},
        ${action},
        '{}'::jsonb,
        ${meta.ip},
        ${meta.userAgent}
      )
    `;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = updatePasswordSchema.parse(await request.json());
    assertPasswordStrength(body.password);
    const meta = requestMeta(request);

    // Password reset via emailed token (no session required).
    if (body.token) {
      const data = await resetPasswordWithToken(body.token, body.password);

      let userId = typeof data?.user?.id === "string" ? data.user.id : null;
      if (!userId) {
        const sql = getSql();
        const [row] = await sql<{ id: string }[]>`
          select u.id::text
          from neon_auth."user" u
          join neon_auth.verification v on v.identifier = u.email
          where v.value = ${body.token}
          order by v."createdAt" desc
          limit 1
        `;
        userId = row?.id ?? null;
      }
      if (!userId) {
        throw new Error("ไม่พบบัญชีสำหรับลิงก์นี้");
      }

      await syncCredentialPassword(userId, body.password);
      await upsertVaultAndAudit(userId, userId, body.password, "auth.password_reset", meta);
      return jsonOk({ userId });
    }

    // Logged-in change (no current password required, same as before).
    const user = await getCurrentUser();
    await syncCredentialPassword(user.id, body.password);
    await upsertVaultAndAudit(user.id, user.id, body.password, "auth.password_reset", meta);

    try {
      await auth.signOut();
    } catch {
      // Sessions were already revoked by the credential sync.
    }

    return jsonOk({ userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
