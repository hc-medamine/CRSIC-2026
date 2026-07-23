import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  createOrgUnit,
  deleteOrgUnit,
  getOrgUnitDeleteImpact,
  listOrgUnits,
  updateOrgUnit,
  type ContentType,
} from "@/lib/users";

export const runtime = "nodejs";

async function requireSuperAdminApi() {
  const session = await getSession();
  const user = session.user;
  if (!user || user.role !== "super_admin" || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return user;
}

export async function GET() {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const orgUnits = await listOrgUnits();
  return NextResponse.json({ ok: true, orgUnits });
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      nameAr?: string;
      nameEn?: string;
      kind?: "centre_wide" | "research_dept";
      sortOrder?: number;
      contentTypes?: ContentType[];
    };
    const org = await createOrgUnit(admin, {
      id: body.id,
      nameAr: body.nameAr ?? "",
      nameEn: body.nameEn ?? "",
      kind: body.kind ?? "research_dept",
      sortOrder: body.sortOrder,
      contentTypes: body.contentTypes,
    });
    return NextResponse.json({ ok: true, orgUnit: org });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    const status = message.includes("already exists")
      ? 409
      : message.includes("Cannot change catalog") ||
          message.includes("already assigned to another org")
        ? 409
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
