import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { escalateItem } from "@/lib/content/delegation";

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
    const body = (await request.json()) as { contentItemId?: string; note?: string };
    if (!body.contentItemId) throw new Error("contentItemId required");
    await escalateItem(user, body.contentItemId, body.note ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message.includes("Only") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
