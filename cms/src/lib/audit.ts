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

export async function listAuditLog(opts?: {
  limit?: number;
  action?: string;
}): Promise<AuditRow[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  if (opts?.action) {
    const result = await query<AuditRow>(
      `SELECT id, created_at, actor_user_id, actor_email, action, entity_type, entity_id,
              summary, metadata, ip, user_agent
       FROM audit_log
       WHERE action = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [opts.action, limit],
    );
    return result.rows;
  }
  const result = await query<AuditRow>(
    `SELECT id, created_at, actor_user_id, actor_email, action, entity_type, entity_id,
            summary, metadata, ip, user_agent
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export function clientMeta(request: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const userAgent = request.headers.get("user-agent");
  return { ip, userAgent };
}
