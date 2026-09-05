import { type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { syncCredentialPassword } from "@/lib/credential-password";
import { getSql } from "@/lib/db";
import { isOwnerEmail } from "@/lib/env";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, encryptPassword } from "@/lib/password-vault";
import { passwordSchema, profileSchema } from "@/lib/validation";

const onboardingSchema = profileSchema.merge(passwordSchema);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user.email) throw new HttpError(400, "บัญชีนี้ไม่มีอีเมล");
    const body = onboardingSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const sql = getSql();
    const [existingProfile] = await sql<{ onboarding_completed: boolean }[]>`
      select onboarding_completed
      from public.profiles
      where id = ${user.id}
    `;

    if (existingProfile?.onboarding_completed) {
      return jsonOk({ userId: user.id, email: user.email, alreadyOnboarded: true });
    }

    const role = isOwnerEmail(user.email) ? "owner" : "user";
    const encrypted = encryptPassword(body.password);
    const meta = requestMeta(request);

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
          ${user.id}::uuid,
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
          ${user.id}::uuid,
          ${encrypted.ciphertext},
          ${encrypted.iv},
          ${encrypted.authTag},
          'app',
          ${user.id}::uuid
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
          ${user.id}::uuid,
          ${user.id}::uuid,
          'user',
          ${user.id},
          'user.google_onboarded',
          ${tx.json({ role })},
          ${meta.ip},
          ${meta.userAgent}
        )
      `;
    });

    // Give the Google-only account a password for email logins. This revokes
    // the current Google session; the client signs back in with the password.
    await syncCredentialPassword(user.id, body.password);

    return jsonOk({ userId: user.id, email: user.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
