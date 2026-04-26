import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireActiveProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, requestMeta } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { feedbackSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireActiveProfile();
    const body = feedbackSchema.parse(await request.json());
    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("feedback")
      .insert({ user_id: profile.id, message: body.message })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: profile.id,
      targetUserId: profile.id,
      entityType: "feedback",
      entityId: data.id,
      action: "feedback.created",
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new Error(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"));
    }
    return jsonError(error);
  }
}
