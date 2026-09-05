import { type NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireActiveProfile } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { feedbackSchema } from "@/lib/validation";

type FeedbackRow = {
  id: string;
  user_id: string;
  message: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export async function POST(request: NextRequest) {
  try {
    const profile = await requireActiveProfile();
    const body = feedbackSchema.parse(await request.json());
    const sql = getSql();
    const [data] = await sql<FeedbackRow[]>`
      insert into public.feedback (user_id, message)
      values (${profile.id}, ${body.message})
      returning *
    `;

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
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
