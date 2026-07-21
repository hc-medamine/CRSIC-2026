import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  confirmReviewOwner,
  listEligibleReviewOwners,
  listPendingReviewOwnerProposals,
  proposeReviewOwner,
} from "@/lib/content/delegation";

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

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind === "eligible") {
    if (user.role !== "super_admin" && user.role !== "reviewer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const users = await listEligibleReviewOwners();
    return NextResponse.json({ ok: true, users });
  }

  if (kind === "pending") {
    if (user.role !== "super_admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const proposals = await listPendingReviewOwnerProposals();
    return NextResponse.json({ ok: true, proposals });
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
      newOwnerId?: string;
      accept?: boolean;
    };
    if (!body.contentItemId) throw new Error("contentItemId required");

    switch (body.action) {
      case "propose":
        if (!body.newOwnerId) throw new Error("newOwnerId required");
        await proposeReviewOwner(user, body.contentItemId, body.newOwnerId);
        break;
      case "confirm":
        await confirmReviewOwner(user, body.contentItemId, true);
        break;
      case "reject":
        await confirmReviewOwner(user, body.contentItemId, false);
        break;
      default:
        throw new Error("Unknown action");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message.includes("Only") || message.includes("Forbidden") || message.includes("Away")
        ? 403
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
