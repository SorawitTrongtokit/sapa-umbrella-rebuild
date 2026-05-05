import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireActiveProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { profileSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  try {
    const profile = await requireActiveProfile();
    const body = profileSchema.parse(await request.json());
    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("profiles")
      .update({
        display_name: body.displayName ?? null,
        class_level: body.classLevel,
        student_number: body.studentNumber
      })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: profile.id,
      targetUserId: profile.id,
      entityType: "user",
      entityId: profile.id,
      action: "profile.updated",
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
