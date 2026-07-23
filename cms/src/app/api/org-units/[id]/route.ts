import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  deleteOrgUnit,
  getOrgUnitDeleteImpact,
  updateOrgUnit,
  type ContentType,
} from "@/lib/users";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function requireSuperAdminApi() {
  const session = await getSession();
  const user = session.user;
  if (!user || user.role !== "super_admin" || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return user;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const impact = await getOrgUnitDeleteImpact(id);
  if (!impact) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, impact });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  try {
    const body = (await request.json()) as {
      nameAr?: string;
      nameEn?: string;
      kind?: "centre_wide" | "research_dept";
      sortOrder?: number;
      contentTypes?: ContentType[];
    };
    const org = await updateOrgUnit(admin, id, {
      nameAr: body.nameAr ?? "",
      nameEn: body.nameEn ?? "",
      kind: body.kind ?? "research_dept",
      sortOrder: body.sortOrder ?? 0,
      contentTypes: body.contentTypes ?? [],
    });
    return NextResponse.json({ ok: true, orgUnit: org });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status = message.includes("not found")
      ? 404
      : message.includes("Cannot change catalog") ||
          message.includes("already assigned")
        ? 409
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  try {
    await deleteOrgUnit(admin, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    const status = message.includes("not found")
      ? 404
      : message.includes("Cannot delete")
        ? 409
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
