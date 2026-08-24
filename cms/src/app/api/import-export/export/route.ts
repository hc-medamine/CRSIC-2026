import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { buildExportZip, isExportableType } from "@/lib/content/importExport";

export const runtime = "nodejs";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  if (session.user.role !== "super_admin") return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const type = request.nextUrl.searchParams.get("type") || "";
  const id = request.nextUrl.searchParams.get("id") || undefined;
  if (!isExportableType(type)) {
    return NextResponse.json({ ok: false, error: "Unknown content type" }, { status: 400 });
  }
  try {
    const zip = await buildExportZip(user, type, id || undefined);
    return new NextResponse(new Uint8Array(zip.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zip.filename}"`,
        "X-Export-Count": String(zip.count),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    const status = message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
