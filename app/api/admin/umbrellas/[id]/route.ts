import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";

const adminUmbrellaSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enable"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("disable"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("mark_available"), reason: z.string().trim().min(3).max(500) })
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const profile = await requireRole(["admin", "owner"]);
    const body = adminUmbrellaSchema.parse(await request.json());
    const { id } = await context.params;
    const umbrellaId = Number(id);
    if (!Number.isInteger(umbrellaId) || umbrellaId < 1 || umbrellaId > 21) {
      throw new HttpError(400, "หมายเลขร่มไม่ถูกต้อง");
    }

    const meta = requestMeta(request);
    const sql = getSql();
    const result = await sql.begin(async (tx) => {
      const [umbrella] = await tx<{
        id: number;
        status: string;
        borrowed_by: string | null;
        borrowed_transaction_id: string | null;
      }[]>`
        select id, status, borrowed_by, borrowed_transaction_id
        from public.umbrellas
        where id = ${umbrellaId}
        for update
      `;

      if (!umbrella) throw new HttpError(404, "ไม่พบร่มนี้");

      if (body.action === "enable" && umbrella.status !== "disabled") {
        throw new HttpError(409, "เปิดใช้งานได้เฉพาะร่มที่ถูกปิดใช้งานอยู่");
      }

      if (umbrella.borrowed_transaction_id && body.action !== "enable") {
        await tx`
          update public.borrow_transactions
          set status = 'admin_closed',
              returned_at = now(),
              closed_by = ${profile.id},
              close_reason = ${body.reason}
          where id = ${umbrella.borrowed_transaction_id}
            and status = 'active'
        `;
      }

      const nextStatus = body.action === "disable" ? "disabled" : "available";
      await tx`
        update public.umbrellas
        set status = ${nextStatus},
            borrowed_by = null,
            borrowed_transaction_id = null,
            disabled_reason = ${body.action === "disable" ? body.reason : null},
            version = version + 1
        where id = ${umbrella.id}
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
          ${profile.id},
          ${umbrella.borrowed_by},
          'umbrella',
          ${String(umbrella.id)},
          ${`admin.umbrella.${body.action}`},
          ${tx.json({
            reason: body.reason,
            previousStatus: umbrella.status,
            closedTransactionId: umbrella.borrowed_transaction_id
          })},
          ${meta.ip},
          ${meta.userAgent}
        )
      `;

      return { umbrellaId: umbrella.id, status: nextStatus };
    });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
