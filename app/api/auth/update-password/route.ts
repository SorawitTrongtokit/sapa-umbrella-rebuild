import { type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, decryptPassword, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { passwordSchema } from "@/lib/validation";

type VaultSnapshot = {
  ciphertext: string;
  iv: string;
  auth_tag: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = passwordSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const user = await getCurrentUser();

    const service = createSupabaseServiceClient();
    const sql = getSql();
    const [previousVault] = await sql<VaultSnapshot[]>`
      select ciphertext, iv, auth_tag
      from app_private.password_vault
      where user_id = ${user.id}
    `;
    const previousPassword = previousVault ? decryptPassword(previousVault) : null;
    let authUpdated = false;

    const meta = requestMeta(request);
    try {
      const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
        password: body.password
      });
      if (updateError) throw new Error(updateError.message);
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
            ${user.id},
            ${encrypted.ciphertext},
            ${encrypted.iv},
            ${encrypted.authTag},
            'app',
            ${user.id}
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
            ${user.id},
            ${user.id},
            'user',
            ${user.id},
            'auth.password_reset',
            '{}'::jsonb,
            ${meta.ip},
            ${meta.userAgent}
          )
        `;
      });
    } catch (writeError) {
      if (authUpdated && previousPassword) {
        const { error: rollbackError } = await service.auth.admin.updateUserById(user.id, {
          password: previousPassword
        });
        if (rollbackError) console.error(rollbackError);
      }
      throw writeError;
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    return jsonOk({ userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
