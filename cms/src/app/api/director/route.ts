import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  canManageDirector,
  getSiteDirector,
  publishSiteDirector,
  saveSiteDirector,
} from "@/lib/content/director";

export async function GET() {
  try {
    const user = await requireUser();
    if (!(await canManageDirector(user))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const row = await getSiteDirector();
    return NextResponse.json({ ok: true, item: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (!(await canManageDirector(user))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json()) as {
      action?: string;
      fields?: Record<string, unknown>;
    };
    if (body.action === "publish") {
      const result = await publishSiteDirector(user);
      return NextResponse.json({ ok: true, item: result.row });
    }
    if (body.action === "save" && body.fields) {
      const f = body.fields;
      const item = await saveSiteDirector(user, {
        quoteAr: String(f.quoteAr ?? ""),
        quoteEn: String(f.quoteEn ?? ""),
        nameAr: String(f.nameAr ?? ""),
        nameEn: String(f.nameEn ?? ""),
        roleAr: String(f.roleAr ?? ""),
        roleEn: String(f.roleEn ?? ""),
        portraitPath: f.portraitPath != null ? String(f.portraitPath) : null,
        portraitAltAr: f.portraitAltAr != null ? String(f.portraitAltAr) : null,
        portraitAltEn: f.portraitAltEn != null ? String(f.portraitAltEn) : null,
      });
      return NextResponse.json({ ok: true, item });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Forbidden" || message.includes("permission") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
