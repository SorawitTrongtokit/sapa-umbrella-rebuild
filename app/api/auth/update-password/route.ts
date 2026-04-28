import { type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { passwordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = passwordSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const user = await getCurrentUser();

    const service = createSupabaseServiceClient();
    const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
      password: body.password
    });
    if (updateError) throw new Error(updateError.message);

    const encrypted = encryptPassword(body.password);
    const sql = getSql();
    await sql`
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

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: user.id,
      targetUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "auth.password_reset",
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    return jsonOk({ userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new Error(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"));
    }
    return jsonError(error);
  }
}
