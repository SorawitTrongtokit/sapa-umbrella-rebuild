import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireActiveProfile } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { HttpError, jsonBadRequest, jsonError, jsonOk, requestMeta } from "@/lib/http";

const returnSchema = z.object({
  returnLocationId: z.string().min(1)
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const profile = await requireActiveProfile();
    const body = returnSchema.parse(await request.json());
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
        location_id: string;
        borrowed_by: string | null;
        borrowed_transaction_id: string | null;
      }[]>`
        select id, status, location_id, borrowed_by, borrowed_transaction_id
        from public.umbrellas
        where id = ${umbrellaId}
        for update
      `;

      if (!umbrella) throw new HttpError(404, "ไม่พบร่มนี้");
      if (umbrella.status !== "borrowed" || !umbrella.borrowed_transaction_id) {
        throw new HttpError(409, "ร่มนี้ยังไม่ได้ถูกยืม");
      }
      if (umbrella.borrowed_by !== profile.id) {
        throw new HttpError(403, "คืนได้เฉพาะผู้ที่ยืมร่มนี้เท่านั้น");
      }
      if (body.returnLocationId !== umbrella.location_id) {
        throw new HttpError(400, "ต้องคืนร่มที่จุดเดิมเท่านั้น");
      }

      await tx`
        update public.borrow_transactions
        set status = 'returned',
            return_location_id = ${body.returnLocationId},
            returned_at = now()
        where id = ${umbrella.borrowed_transaction_id}
          and status = 'active'
      `;

      await tx`
        update public.umbrellas
        set status = 'available',
            borrowed_by = null,
            borrowed_transaction_id = null,
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
          ${profile.id},
          'umbrella',
          ${String(umbrella.id)},
          'umbrella.returned',
          ${tx.json({ transactionId: umbrella.borrowed_transaction_id, locationId: body.returnLocationId })},
          ${meta.ip},
          ${meta.userAgent}
        )
      `;

      return { umbrellaId: umbrella.id, transactionId: umbrella.borrowed_transaction_id };
    });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    }
    return jsonError(error);
  }
}
