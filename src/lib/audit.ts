import { prisma } from "./db";
import { clientIp } from "./rate-limit";

type AuditInput = {
  userId?: string | null;
  action: string; // "auth.login", "appointment.cancel", …
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  req?: Request;
};

/** Fire-and-forget audit trail; an audit failure never breaks the request. */
export function audit(input: AuditInput) {
  const data = {
    userId: input.userId ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : undefined,
    ip: input.req ? clientIp(input.req) : null,
  };
  prisma.auditLog.create({ data }).catch((e) => console.error("[audit] write failed:", e.message));
}
