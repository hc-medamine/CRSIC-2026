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

function zipResponse(zip: { filename: string; buffer: Buffer; count: number }) {
  return new NextResponse(new Uint8Array(zip.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.filename}"`,
      "X-Export-Count": String(zip.count),
    },
  });
}

function exportErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Export failed";
  const status = message === "Not found" ? 404 : 400;
  return NextResponse.json({ ok: false, error: message }, { status });
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
    const zip = await buildExportZip(user, type, { itemId: id || undefined });
    return zipResponse(zip);
  } catch (err) {
    return exportErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  let body: { type?: unknown; ids?: unknown };
  try {
    body = (await request.json()) as { type?: unknown; ids?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type : "";
  if (!isExportableType(type)) {
    return NextResponse.json({ ok: false, error: "Unknown content type" }, { status: 400 });
  }
  try {
    const zip = await buildExportZip(user, type, { ids: Array.isArray(body.ids) ? (body.ids as string[]) : [] });
    return zipResponse(zip);
  } catch (err) {
    return exportErrorResponse(err);
  }
}
