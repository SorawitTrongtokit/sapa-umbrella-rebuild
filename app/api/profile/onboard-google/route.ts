import { type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { isOwnerEmail } from "@/lib/env";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { assertPasswordStrength, decryptPassword, encryptPassword } from "@/lib/password-vault";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { passwordSchema, profileSchema } from "@/lib/validation";

const onboardingSchema = profileSchema.merge(passwordSchema);

type VaultSnapshot = {
  ciphertext: string;
  iv: string;
  auth_tag: string;
};

function isSamePasswordError(error: { message: string }) {
  const message = error.message.toLowerCase();
  return message.includes("password") && (message.includes("same") || message.includes("different"));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user.email) throw new HttpError(400, "บัญชีนี้ไม่มีอีเมล");
    const body = onboardingSchema.parse(await request.json());
    assertPasswordStrength(body.password);

    const service = createSupabaseServiceClient();
    const role = isOwnerEmail(user.email) ? "owner" : "user";
    const { data: existingProfile } = await service
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile?.onboarding_completed) {
      return jsonOk({ userId: user.id, email: user.email, alreadyOnboarded: true });
    }

    const sql = getSql();
    const [previousVault] = await sql<VaultSnapshot[]>`
      select ciphertext, iv, auth_tag
      from app_private.password_vault
      where user_id = ${user.id}
    `;
    const previousPassword = previousVault ? decryptPassword(previousVault) : null;
    let authUpdated = false;

    const { error } = await service.auth.admin.updateUserById(user.id, {
      password: body.password,
      app_metadata: { role }
    });

    if (error && !isSamePasswordError(error)) throw new Error(error.message);
    authUpdated = !error;

    const encrypted = encryptPassword(body.password);
    const meta = requestMeta(request);
    try {
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
            'user.google_onboarded',
            ${tx.json({ role })},
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

    return jsonOk({ userId: user.id, email: user.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
