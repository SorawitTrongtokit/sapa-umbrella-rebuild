import { type NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireActiveProfile } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";
import type { Profile } from "@/lib/types";
import { profileSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  try {
    const profile = await requireActiveProfile();
    const body = profileSchema.parse(await request.json());
    const sql = getSql();
    const [data] = await sql<Profile[]>`
      update public.profiles
      set display_name = ${body.displayName ?? null},
          class_level = ${body.classLevel},
          student_number = ${body.studentNumber}
      where id = ${profile.id}
      returning *
    `;

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
