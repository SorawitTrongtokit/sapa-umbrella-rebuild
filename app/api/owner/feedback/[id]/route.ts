import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";

const feedbackUpdateSchema = z.object({
  status: z.enum(["new", "reviewed", "archived"])
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(["owner"]);
    const { id: feedbackId } = await context.params;
    const body = feedbackUpdateSchema.parse(await request.json());

    const sql = getSql();
    const [existing] = await sql<{ id: string; status: string; user_id: string }[]>`
      select id, status, user_id from public.feedback where id = ${feedbackId}
    `;

    if (!existing) {
      throw new HttpError(404, "ไม่พบข้อมูลฟีดแบคนี้");
    }

    const meta = requestMeta(request);
    const [updated] = await sql.begin(async (tx) => {
      const [row] = await tx<{ id: string; status: string; user_id: string; updated_at: string }[]>`
        update public.feedback
        set status = ${body.status},
            updated_at = now()
        where id = ${feedbackId}
        returning *
      `;

      await writeAuditLog({
        actorId: actor.id,
        targetUserId: existing.user_id,
        entityType: "feedback",
        entityId: feedbackId,
        action: "owner.feedback.updated",
        details: {
          previousStatus: existing.status,
          nextStatus: body.status
        },
        ip: meta.ip,
        userAgent: meta.userAgent
      });

      return [row];
    });

    return jsonOk(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
