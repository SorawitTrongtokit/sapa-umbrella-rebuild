import { type NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { isOwnerEmail } from "@/lib/env";
import { jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const service = createSupabaseServiceClient();
    const role = isOwnerEmail(body.email) ? "owner" : "user";
    const { data, error } = await service.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: {
        class_level: body.classLevel,
        student_number: body.studentNumber
      }
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "สร้างบัญชีไม่สำเร็จ");
    }

    const encrypted = encryptPassword(body.password);
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
          onboarding_completed
        )
        values (
          ${data.user.id},
          ${body.email},
          ${body.classLevel},
          ${body.studentNumber},
          ${role},
          'active',
          true
        )
        on conflict (id) do update
        set email = excluded.email,
            class_level = excluded.class_level,
            student_number = excluded.student_number,
            role = excluded.role,
            status = excluded.status,
            onboarding_completed = true
      `;
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
          ${data.user.id},
          ${encrypted.ciphertext},
          ${encrypted.iv},
          ${encrypted.authTag},
          'app',
          ${data.user.id}
        )
        on conflict (user_id) do update
        set ciphertext = excluded.ciphertext,
            iv = excluded.iv,
            auth_tag = excluded.auth_tag,
            source = excluded.source,
            changed_by = excluded.changed_by,
            changed_at = now()
      `;
    });

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: data.user.id,
      targetUserId: data.user.id,
      entityType: "user",
      entityId: data.user.id,
      action: "user.registered",
      details: { role },
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk({ userId: data.user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new Error(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"));
    }
    return jsonError(error);
  }
}
