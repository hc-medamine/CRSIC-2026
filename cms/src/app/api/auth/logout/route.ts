import { NextRequest, NextResponse } from "next/server";
import { getSessionForRoute } from "@/lib/auth/session";
import { clientMeta, writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getSessionForRoute(request, response);
  const user = session.user;
  const meta = clientMeta(request);
  if (user) {
    await writeAudit({
      actor: user,
      action: "auth.logout",
      summary: `Logout for ${user.email}`,
      ...meta,
    });
  }
  session.destroy();
  return response;
}
