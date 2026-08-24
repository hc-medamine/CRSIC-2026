import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { cloneContentItem, undoCloneContentItem } from "@/lib/content/cloneContent";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  try {
    const body = (await request.json()) as { action?: string; id?: string };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) throw new Error("id required");
    if (body.action === "undo") {
      const item = await undoCloneContentItem(user, id);
      return NextResponse.json({ ok: true, item });
    }
    if (body.action && body.action !== "clone") throw new Error("Unknown action");
    const item = await cloneContentItem(user, id);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clone failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
