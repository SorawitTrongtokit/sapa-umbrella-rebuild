import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { HttpError, jsonError, jsonOk, requestMeta } from "@/lib/http";
import { decryptPassword } from "@/lib/password-vault";
import { auditReasonSchema } from "@/lib/validation";
import type { PasswordVaultRow } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(["owner"]);
    const { id } = await context.params;
    const body = auditReasonSchema.parse(await request.json());
    const sql = getSql();
    const [row] = await sql<PasswordVaultRow[]>`
      select user_id, ciphertext, iv, auth_tag, key_version, source, changed_by, changed_at
      from app_private.password_vault
      where user_id = ${id}
    `;

    if (!row) {
      throw new HttpError(404, "ยังไม่มีรหัสผ่านในคลังสำหรับบัญชีนี้");
    }

    const password = decryptPassword(row);
    const meta = requestMeta(request);
    await writeAuditLog({
      actorId: actor.id,
      targetUserId: id,
      entityType: "user",
      entityId: id,
      action: "owner.password.revealed",
      details: { reason: body.reason, source: row.source },
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return jsonOk({ password, source: row.source, changedAt: row.changed_at });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new Error(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"));
    }
    return jsonError(error);
  }
}
