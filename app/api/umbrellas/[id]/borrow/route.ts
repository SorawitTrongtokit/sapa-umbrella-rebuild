import { type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { HttpError, jsonError, jsonOk, requestMeta } from "@/lib/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const profile = await requireActiveProfile();
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
        has_active_borrow: boolean;
      }[]>`
        select
          u.id,
          u.status,
          u.location_id,
          exists (
            select 1
            from public.borrow_transactions bt
            where bt.borrower_id = ${profile.id}
              and bt.status = 'active'
          ) as has_active_borrow
        from public.umbrellas u
        where u.id = ${umbrellaId}
        for update of u
      `;

      if (!umbrella) throw new HttpError(404, "ไม่พบร่มนี้");
      if (umbrella.status === "disabled") throw new HttpError(409, "ร่มนี้ปิดใช้งานอยู่");
      if (umbrella.status !== "available") throw new HttpError(409, "ร่มนี้ถูกยืมแล้ว");

      if (umbrella.has_active_borrow) {
        throw new HttpError(409, "คุณมีร่มที่ยังไม่ได้คืน");
      }

      const [transaction] = await tx<{ id: string }[]>`
        insert into public.borrow_transactions (
          umbrella_id,
          borrower_id,
          borrow_location_id,
          status
        )
        values (${umbrella.id}, ${profile.id}, ${umbrella.location_id}, 'active')
        returning id
      `;

      await tx`
        update public.umbrellas
        set status = 'borrowed',
            borrowed_by = ${profile.id},
            borrowed_transaction_id = ${transaction.id},
            disabled_reason = null,
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
          'umbrella.borrowed',
          ${tx.json({ transactionId: transaction.id, locationId: umbrella.location_id })},
          ${meta.ip},
          ${meta.userAgent}
        )
      `;

      return { umbrellaId: umbrella.id, transactionId: transaction.id };
    });

    return jsonOk(result);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(new HttpError(409, "คุณมีร่มที่ยังไม่ได้คืน"));
    }
    return jsonError(error);
  }
}
