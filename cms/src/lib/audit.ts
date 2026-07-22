import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";

export type AuditInput = {
  actor?: SessionUser | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuditRow = {
  id: string;
  created_at: Date;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
};

/** Append-only. Failures are logged to console and never block the primary action. */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log
        (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
      [
        input.actor?.id ?? null,
        input.actorEmail ?? input.actor?.email ?? null,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.summary,
        JSON.stringify(input.metadata ?? {}),
        input.ip ?? null,
        input.userAgent ?? null,
      ],
    );
  } catch (err) {
    console.error("audit write failed", err);
  }
}

export type AuditListFilters = {
  limit?: number;
  /** Exact action match (audit_log_action_idx). */
  action?: string;
  /** Exact actor email, case-insensitive. */
  actorEmail?: string;
  /** Exact actor user id (audit_log_actor_idx). */
  actorUserId?: string;
  /** Exact entity type (audit_log_entity_idx with entityId). */
  entityType?: string;
  /** Exact entity id. */
  entityId?: string;
  /** Inclusive start (YYYY-MM-DD or ISO datetime; audit_log_created_at_idx). */
  from?: string;
  /** Inclusive end (YYYY-MM-DD → end of that UTC day, or ISO datetime). */
  to?: string;
};

function parseBound(raw: string | undefined, endOfDay: boolean): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return endOfDay
      ? new Date(`${s}T23:59:59.999Z`)
      : new Date(`${s}T00:00:00.000Z`);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listAuditLog(opts?: AuditListFilters): Promise<AuditRow[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const where: string[] = [];
  const params: unknown[] = [];

  const push = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };

  if (opts?.action?.trim()) {
    push("action = ?", opts.action.trim());
  }
  if (opts?.actorUserId?.trim()) {
    push("actor_user_id = ?::uuid", opts.actorUserId.trim());
  } else if (opts?.actorEmail?.trim()) {
    push("LOWER(actor_email) = LOWER(?)", opts.actorEmail.trim());
  }
  if (opts?.entityType?.trim()) {
    push("entity_type = ?", opts.entityType.trim());
  }
  if (opts?.entityId?.trim()) {
    push("entity_id = ?", opts.entityId.trim());
  }
  const from = parseBound(opts?.from, false);
  if (from) push("created_at >= ?", from);
  const to = parseBound(opts?.to, true);
  if (to) push("created_at <= ?", to);

  params.push(limit);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const result = await query<AuditRow>(
    `SELECT id, created_at, actor_user_id, actor_email, action, entity_type, entity_id,
            summary, metadata, ip, user_agent
     FROM audit_log
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export function clientMeta(request: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const userAgent = request.headers.get("user-agent");
  return { ip, userAgent };
}
