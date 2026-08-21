import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  canAccessFeaturedNews,
  canPublishFeaturedNews,
  getSiteFeaturedNews,
  listLiveNewsForFeatured,
  publishFeaturedNews,
  saveFeaturedNewsDraft,
} from "@/lib/content/featuredNews";

export async function GET() {
  try {
    const user = await requireUser();
    if (!(await canAccessFeaturedNews(user))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const item = await getSiteFeaturedNews();
    const liveNews = await listLiveNewsForFeatured(user);
    return NextResponse.json({
      ok: true,
      item,
      liveNews,
      canPublish: canPublishFeaturedNews(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (!(await canAccessFeaturedNews(user))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json()) as { action?: string; ids?: unknown };
    if (body.action === "publish") {
      const item = await publishFeaturedNews(user);
      return NextResponse.json({ ok: true, item });
    }
    if (body.action === "save") {
      const item = await saveFeaturedNewsDraft(user, body.ids);
      return NextResponse.json({ ok: true, item });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message === "Forbidden" || message.includes("permission") || message.includes("Only a Reviewer")
        ? 403
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
