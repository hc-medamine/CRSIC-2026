import { NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { ALL_CONTENT_TYPES, type ContentType } from "@/lib/content-types";
import { rebuildWebpForContentType, rebuildWebpForDirector } from "@/lib/media/rebuildWebp";
import { writePublicDirectorJson } from "@/lib/publish/directorJson";
import { query } from "@/lib/db";
import { ensureWebpForContentRow } from "@/lib/media/publishImages";

export const runtime = "nodejs";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  if (session.user.role !== "super_admin") return null;
  return session.user;
}

export async function POST(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  let body: { type?: string; director?: boolean };
  try {
    body = (await req.json()) as { type?: string; director?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.director) {
    const row = await query<{
      quote_ar: string;
      quote_en: string;
      name_ar: string;
      name_en: string;
      role_ar: string;
      role_en: string;
      portrait_path: string | null;
      portrait_alt_ar: string | null;
      portrait_alt_en: string | null;
    }>(`SELECT * FROM site_director WHERE id = 1`);
    const d = row.rows[0];
    if (!d) {
      return NextResponse.json({ ok: false, error: "Director record not found" }, { status: 404 });
    }
    await ensureWebpForContentRow({ portrait_path: d.portrait_path });
    writePublicDirectorJson(d);
    const stats = await rebuildWebpForDirector();
    return NextResponse.json({ ok: true, ...stats });
  }

  const type = body.type?.trim();
  if (!type || !(ALL_CONTENT_TYPES as string[]).includes(type)) {
    return NextResponse.json({ ok: false, error: "Valid content type is required" }, { status: 400 });
  }

  try {
    const result = await rebuildWebpForContentType(user, type as ContentType);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "WebP rebuild failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
