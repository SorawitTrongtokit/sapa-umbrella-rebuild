import { getSql } from "@/lib/db";

type AuditInput = {
  actorId: string | null;
  targetUserId?: string | null;
  entityType: string;
  entityId?: string | number | null;
  action: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  const sql = getSql();
  const details = (input.details ?? {}) as Parameters<typeof sql.json>[0];
  await sql`
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
      ${input.actorId},
      ${input.targetUserId ?? null},
      ${input.entityType},
      ${input.entityId == null ? null : String(input.entityId)},
      ${input.action},
      ${sql.json(details)},
      ${input.ip ?? null},
      ${input.userAgent ?? null}
    )
  `;
}
