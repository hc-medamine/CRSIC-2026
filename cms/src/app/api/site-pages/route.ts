import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  canManageSitePages,
  getSitePages,
  publishSitePages,
  saveSitePages,
} from "@/lib/content/sitePages";

export async function GET() {
  try {
    const user = await requireUser();
    if (!(await canManageSitePages(user))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const row = await getSitePages();
    return NextResponse.json({ ok: true, item: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (!(await canManageSitePages(user))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json()) as {
      action?: string;
      fields?: Record<string, unknown>;
    };
    if (body.action === "publish") {
      const result = await publishSitePages(user);
      return NextResponse.json({ ok: true, item: result.row });
    }
    if (body.action === "save" && body.fields) {
      const f = body.fields;
      const item = await saveSitePages(user, {
        fieldsAr: (f.fieldsAr ?? {}) as Record<string, string>,
        fieldsEn: (f.fieldsEn ?? {}) as Record<string, string>,
        email: String(f.email ?? ""),
        phone: String(f.phone ?? ""),
        webmailUrl: String(f.webmailUrl ?? ""),
        webmailText: String(f.webmailText ?? ""),
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
