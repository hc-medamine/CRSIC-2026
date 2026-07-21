import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionForRoute, sessionTimeoutMs } from "@/lib/auth/session";
import {
  clearAway,
  getAwayState,
  listActiveEditors,
  setAway,
} from "@/lib/content/ooo";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const targetId = request.nextUrl.searchParams.get("userId") ?? user.id;
  if (targetId !== user.id && user.role !== "super_admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const away = await getAwayState(targetId);
  const editors =
    user.role === "reviewer" || user.role === "super_admin"
      ? await listActiveEditors()
      : [];
  return NextResponse.json({ ok: true, away, editors });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: string;
      userId?: string;
      elevateEditorId?: string;
      awayUntil?: string | null;
    };

    const response = NextResponse.json({ ok: true });
    const session = await getSessionForRoute(request, response);
    if (!session.user || !session.lastActivityAt) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }
    if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) {
      return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
    }
    const user = session.user;
    const targetId = body.userId ?? user.id;

    if (body.action === "set") {
      if (!body.elevateEditorId) throw new Error("elevateEditorId required");
      const until =
        body.awayUntil && body.awayUntil.trim()
          ? new Date(body.awayUntil)
          : null;
      if (until && Number.isNaN(until.getTime())) throw new Error("Invalid awayUntil date");
      await setAway(user, targetId, { until, elevateEditorId: body.elevateEditorId });
    } else if (body.action === "clear") {
      await clearAway(user, targetId);
    } else {
      throw new Error("Unknown action");
    }

    // Refresh session role in case this user was elevated/reverted
    const { refreshUserFromDb } = await import("@/lib/content/ooo");
    const fresh = await refreshUserFromDb(user.id);
    if (fresh) {
      session.user = fresh;
      session.lastActivityAt = Date.now();
      await session.save();
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message.includes("Only") || message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
