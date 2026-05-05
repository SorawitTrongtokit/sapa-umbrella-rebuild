import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, decryptPassword, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { passwordSchema } from "@/lib/validation";

type VaultSnapshot = {
  ciphertext: string;
  iv: string;
  auth_tag: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(["owner"]);
    const { id } = await context.params;
    const body = passwordSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const service = createSupabaseServiceClient();
    const sql = getSql();
    const [previousVault] = await sql<VaultSnapshot[]>`
      select ciphertext, iv, auth_tag
      from app_private.password_vault
      where user_id = ${id}
    `;
    const previousPassword = previousVault ? decryptPassword(previousVault) : null;
    let authUpdated = false;

    const meta = requestMeta(request);
    try {
      const { error } = await service.auth.admin.updateUserById(id, {
        password: body.password
      });
      if (error) throw new Error(error.message);
      authUpdated = true;

      const encrypted = encryptPassword(body.password);
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
            ${id},
            ${encrypted.ciphertext},
            ${encrypted.iv},
            ${encrypted.authTag},
            'app',
            ${actor.id}
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
            ${id},
            'user',
            ${id},
            'owner.password.changed',
            '{}'::jsonb,
            ${meta.ip},
            ${meta.userAgent}
          )
        `;
      });
    } catch (writeError) {
      if (authUpdated && previousPassword) {
        const { error: rollbackError } = await service.auth.admin.updateUserById(id, {
          password: previousPassword
        });
        if (rollbackError) console.error(rollbackError);
      }
      throw writeError;
    }

    return jsonOk({ userId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
