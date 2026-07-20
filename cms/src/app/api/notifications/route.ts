import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  countUnread,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  const [items, unread] = await Promise.all([
    listNotificationsForUser(user.id),
    countUnread(user.id),
  ]);

  return NextResponse.json({
    ok: true,
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkPath: n.link_path,
      readAt: n.read_at?.toISOString() ?? null,
      createdAt: n.created_at.toISOString(),
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "mark_read" | "mark_all_read";
    id?: string;
  };

  if (body.action === "mark_all_read") {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark_read" && body.id) {
    await markNotificationRead(user.id, body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
