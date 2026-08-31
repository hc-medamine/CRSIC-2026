import { NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { listAssignableUsers } from "@/lib/content/lifecycle";

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
  if (user.role !== "super_admin" && user.role !== "reviewer") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const contentItemId = request.nextUrl.searchParams.get("contentItemId") ?? undefined;
  try {
    const users = await listAssignableUsers(user, contentItemId);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Forbidden" || message === "Not found" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
