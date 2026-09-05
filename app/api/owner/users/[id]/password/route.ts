import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { syncCredentialPassword } from "@/lib/credential-password";
import { getSql } from "@/lib/db";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { passwordSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(["owner"]);
    const { id } = await context.params;
    const body = passwordSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const meta = requestMeta(request);
    const encrypted = encryptPassword(body.password);

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
          ${id}::uuid,
          ${encrypted.ciphertext},
          ${encrypted.iv},
          ${encrypted.authTag},
          'app',
          ${actor.id}::uuid
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
          ${actor.id},
          ${id}::uuid,
          'user',
          ${id},
          'owner.password.changed',
          '{}'::jsonb,
          ${meta.ip},
          ${meta.userAgent}
        )
      `;
    });

    // Update the auth provider hash and revoke the target user's sessions.
    await syncCredentialPassword(id, body.password);

    return jsonOk({ userId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
