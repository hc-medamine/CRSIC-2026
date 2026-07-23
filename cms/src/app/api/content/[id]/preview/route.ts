import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { clientMeta } from "@/lib/audit";
import { createPreviewToken } from "@/lib/content/preview";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

/** Create a short-lived A1 preview token for SPA #preview/{token}. */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  try {
    const created = await createPreviewToken(user, id, clientMeta(request));
    return NextResponse.json({ ok: true, ...created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    const status =
      message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
