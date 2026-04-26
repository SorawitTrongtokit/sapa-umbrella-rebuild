import { type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { isOwnerEmail } from "@/lib/env";
import { HttpError, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { passwordSchema, profileSchema } from "@/lib/validation";

const onboardingSchema = profileSchema.merge(passwordSchema);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user.email) throw new HttpError(400, "บัญชีนี้ไม่มีอีเมล");
    const body = onboardingSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const service = createSupabaseServiceClient();
    const role = isOwnerEmail(user.email) ? "owner" : "user";
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password: body.password,
      app_metadata: { role }
    });

    if (error) throw new Error(error.message);

    const encrypted = encryptPassword(body.password);
    const sql = getSql();
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
          onboarding_completed
        )
        values (
          ${user.id},
          ${user.email},
          ${body.displayName ?? null},
          ${body.classLevel},
          ${body.studentNumber},
          ${role},
          'active',
          true
        )
        on conflict (id) do update
        set email = excluded.email,
            display_name = excluded.display_name,
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
    });

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: user.id,
      targetUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.google_onboarded",
      details: { role },
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk({ userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new Error(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"));
    }
    return jsonError(error);
  }
}
