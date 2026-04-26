import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
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

    const service = createSupabaseServiceClient();
    const { error } = await service.auth.admin.updateUserById(id, {
      password: body.password
    });
    if (error) throw new Error(error.message);

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

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: actor.id,
      targetUserId: id,
      entityType: "user",
      entityId: id,
      action: "owner.password.changed",
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk({ userId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new Error(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"));
    }
    return jsonError(error);
  }
}
