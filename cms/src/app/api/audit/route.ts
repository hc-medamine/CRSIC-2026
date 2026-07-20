import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { listAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

async function requireSuperAdminApi() {
  const session = await getSession();
  const user = session.user;
  if (!user || user.role !== "super_admin" || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const action = request.nextUrl.searchParams.get("action") ?? undefined;
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 100;
  const rows = await listAuditLog({ action, limit: Number.isFinite(limit) ? limit : 100 });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at.toISOString(),
      actorUserId: r.actor_user_id,
      actorEmail: r.actor_email,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      summary: r.summary,
      metadata: r.metadata,
      ip: r.ip,
      userAgent: r.user_agent,
    })),
  });
}
