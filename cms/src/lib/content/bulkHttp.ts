import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs, type SessionUser } from "@/lib/auth/session";
import { isNewsBulkAction, type NewsBulkAction, type NewsBulkResult } from "@/lib/content/newsBulk";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

export function createBulkPostHandler(
  run: (user: SessionUser, action: NewsBulkAction, ids: unknown) => Promise<NewsBulkResult>,
) {
  return async function POST(request: NextRequest) {
    const user = await requireSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    try {
      const body = (await request.json()) as { action?: string; ids?: unknown };
      if (!isNewsBulkAction(body.action)) throw new Error("Unknown action");
      const result = await run(user, body.action, body.ids);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  };
}
