import { NextRequest, NextResponse } from "next/server";
import { getSessionForRoute, sessionTimeoutMs } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Refresh idle timer — must run in a Route Handler (can set cookies). */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getSessionForRoute(request, response);

  if (!session.user || !session.lastActivityAt) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) {
    session.destroy();
    return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
  }

  session.lastActivityAt = Date.now();
  const { refreshUserFromDb } = await import("@/lib/content/ooo");
  const fresh = await refreshUserFromDb(session.user.id);
  if (fresh) session.user = fresh;
  await session.save();
  return response;
}
