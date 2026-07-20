import { NextRequest, NextResponse } from "next/server";
import { getSessionForRoute } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getSessionForRoute(request, response);
  session.destroy();
  return response;
}
