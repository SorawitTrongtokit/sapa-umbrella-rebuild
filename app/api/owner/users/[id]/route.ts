import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";

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

    const changed = Object.keys(update);
    if (!changed.length) {
      throw new HttpError(400, "ไม่มีข้อมูลที่ต้องแก้ไข");
    }

    const sql = getSql();
    const [existing] = await sql<Profile[]>`
      select * from public.profiles where id = ${id}
    `;
    if (!existing) throw new HttpError(404, "ไม่พบผู้ใช้");

    let authRoleUpdated = false;
    if (body.role) {
      const { error: authError } = await service.auth.admin.updateUserById(id, {
        app_metadata: { role: body.role }
      });
      if (authError) throw new Error(authError.message);
      authRoleUpdated = true;
    }

    const meta = requestMeta(request);
    let data: Profile;
    try {
      [data] = await sql.begin(async (tx) => {
        const rows = await tx<Profile[]>`
          update public.profiles
          set display_name = ${"displayName" in body ? body.displayName ?? null : existing.display_name},
              class_level = ${body.classLevel ?? existing.class_level},
              student_number = ${body.studentNumber ?? existing.student_number},
              role = ${body.role ?? existing.role},
              status = ${body.status ?? existing.status}
          where id = ${id}
          returning *
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
            ${actor.id},
            ${id},
            'user',
            ${id},
            'owner.user.updated',
            ${tx.json({ changed })},
            ${meta.ip},
            ${meta.userAgent}
          )
        `;

        return rows;
      });
    } catch (writeError) {
      if (authRoleUpdated) {
        const { error: rollbackError } = await service.auth.admin.updateUserById(id, {
          app_metadata: { role: existing.role }
        });
        if (rollbackError) console.error(rollbackError);
      }
      throw writeError;
    }

    return jsonOk(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
