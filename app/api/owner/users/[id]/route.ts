import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { HttpError, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const ownerUserSchema = z.object({
  displayName: z.string().trim().max(120).nullable().optional(),
  classLevel: z.string().trim().min(1).max(20).optional(),
  studentNumber: z.coerce.number().int().min(1).max(99).optional(),
  role: z.enum(["user", "admin", "owner"]).optional(),
  status: z.enum(["active", "suspended"]).optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(["owner"]);
    const { id } = await context.params;
    const body = ownerUserSchema.parse(await request.json());

    if (actor.id === id && body.role && body.role !== "owner") {
      throw new HttpError(400, "ไม่สามารถลดสิทธิ์ Owner ของตัวเองได้");
    }
    if (actor.id === id && body.status === "suspended") {
      throw new HttpError(400, "ไม่สามารถระงับบัญชีตัวเองได้");
    }

    const service = createSupabaseServiceClient();
    const update: Record<string, unknown> = {};
    if ("displayName" in body) update.display_name = body.displayName ?? null;
    if (body.classLevel) update.class_level = body.classLevel;
    if (body.studentNumber) update.student_number = body.studentNumber;
    if (body.role) update.role = body.role;
    if (body.status) update.status = body.status;

    const { data, error } = await service.from("profiles").update(update).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);

    if (body.role) {
      const { error: authError } = await service.auth.admin.updateUserById(id, {
        app_metadata: { role: body.role }
      });
      if (authError) throw new Error(authError.message);
    }

    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: actor.id,
      targetUserId: id,
      entityType: "user",
      entityId: id,
      action: "owner.user.updated",
      details: { changed: Object.keys(update) },
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
