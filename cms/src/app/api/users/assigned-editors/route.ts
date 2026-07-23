import { NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { listAssignedEditors, listEditorContentTypeClaims, listOrgUnits } from "@/lib/users";

export const runtime = "nodejs";

async function requireReviewerOrSa() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  if (session.user.role !== "reviewer" && session.user.role !== "super_admin") return null;
  return session.user;
}

export async function GET() {
  const user = await requireReviewerOrSa();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const [editors, claims, orgUnits] = await Promise.all([
    listAssignedEditors(user),
    listEditorContentTypeClaims(),
    listOrgUnits(),
  ]);
  return NextResponse.json({ ok: true, editors, claims, orgUnits });
}
