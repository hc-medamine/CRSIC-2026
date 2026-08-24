import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  countExportable,
  importCmsZip,
  isExportableType,
  listExportPicker,
} from "@/lib/content/importExport";
import { parseExportPickerSort } from "@/lib/content/headerSort";
import { ALL_CONTENT_TYPES } from "@/lib/content-types";

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
  const type = request.nextUrl.searchParams.get("type") || "news";
  if (!isExportableType(type)) {
    return NextResponse.json({ ok: false, error: "Unknown content type" }, { status: 400 });
  }
  const q = request.nextUrl.searchParams.get("q") || "";
  const page = request.nextUrl.searchParams.get("page");
  const sort = parseExportPickerSort(
    request.nextUrl.searchParams.get("sort"),
    request.nextUrl.searchParams.get("dir"),
  );
  const [picker, count] = await Promise.all([
    listExportPicker(type, { q, page, sort }),
    countExportable(type),
  ]);
  return NextResponse.json({
    ok: true,
    types: ALL_CONTENT_TYPES,
    items: picker.items,
    count,
    hasMore: picker.hasMore,
    page: picker.page,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Choose a zip file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const report = await importCmsZip(user, buf);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
