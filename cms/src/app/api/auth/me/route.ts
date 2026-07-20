import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }
}
