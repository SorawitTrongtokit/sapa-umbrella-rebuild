import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { isOwnerEmail } from "@/lib/env";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const role = isOwnerEmail(body.email) ? "owner" : "user";
    const neonRole = role === "user" ? "user" : "admin";
    const { data, error } = await auth.signUp.email({
      email: body.email,
      password: body.password,
      name: body.email.split("@")[0] || body.email
    });

    if (error || !data?.user) {
      throw new Error(error?.message ?? "สร้างบัญชีไม่สำเร็จ");
    }
    const userId = data.user.id;

    try {
      const encrypted = encryptPassword(body.password);
      const sql = getSql();
      await sql.begin(async (tx) => {
        await tx`
          update neon_auth."user"
          set "emailVerified" = true,
              role = ${neonRole}
          where id = ${userId}::uuid
        `;
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
            ${userId}::uuid,
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
            ${userId}::uuid,
            ${encrypted.ciphertext},
            ${encrypted.iv},
            ${encrypted.authTag},
            'app',
            ${userId}::uuid
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
        actorId: userId,
        targetUserId: userId,
        entityType: "user",
        entityId: userId,
        action: "user.registered",
        details: { role },
        ip: meta.ip,
        userAgent: meta.userAgent
      });
    } catch (writeError) {
      const sql = getSql();
      await sql`
        delete from neon_auth.account where "userId" = ${userId}::uuid
      `;
      await sql`
        delete from neon_auth."user" where id = ${userId}::uuid
      `;
      throw writeError;
    }

    return jsonOk({ userId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
