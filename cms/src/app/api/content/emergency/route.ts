import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  confirmPostReview,
  emergencyPublish,
  listNeedsPostReview,
  requestPostReviewChanges,
  unpublishPostReview,
} from "@/lib/content/emergency";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "super_admin" && user.role !== "reviewer") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind === "pending") {
    const items = await listNeedsPostReview();
    return NextResponse.json({ ok: true, items });
  }
  return NextResponse.json({ ok: false, error: "Unknown kind" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      action?: string;
      contentItemId?: string;
      reason?: string;
      note?: string;
    };
    if (!body.contentItemId) throw new Error("contentItemId required");

    if (body.action === "publish") {
      await emergencyPublish(user, body.contentItemId, body.reason ?? "");
    } else if (body.action === "confirm") {
      await confirmPostReview(user, body.contentItemId);
    } else if (body.action === "request_changes") {
      await requestPostReviewChanges(user, body.contentItemId, body.note ?? "");
    } else if (body.action === "unpublish") {
      await unpublishPostReview(user, body.contentItemId);
    } else {
      throw new Error("Unknown action");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message.includes("Only") ||
      message.includes("cannot Confirm") ||
      message.includes("role required")
        ? 403
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
