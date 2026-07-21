import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  approveNews,
  getNewsById,
  publishNews,
  rejectNews,
  requestNewsChanges,
  submitNews,
  unpublishNews,
  updateNewsDraft,
  withdrawNews,
  type NewsInput,
} from "@/lib/content/news";
import {
  deleteContentItem,
  reassignAuthor,
  reopenRejected,
  restoreRevision,
  startRevision,
} from "@/lib/content/lifecycle";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(item: NonNullable<Awaited<ReturnType<typeof getNewsById>>>) {
  return {
    ...item,
    published_at: item.published_at?.toISOString() ?? null,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
  };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const item = await getNewsById(id);
  if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, item: serialize(item) });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action?: string;
      checklistConfirmed?: boolean;
      note?: string;
      fields?: NewsInput;
      revisionId?: string;
      newUserId?: string;
    };

    let item;
    switch (body.action) {
      case "save":
        if (!body.fields) throw new Error("fields required");
        item = await updateNewsDraft(user, id, body.fields);
        break;
      case "submit":
        item = await submitNews(user, id, Boolean(body.checklistConfirmed));
        break;
      case "withdraw":
        item = await withdrawNews(user, id);
        break;
      case "request_changes":
        item = await requestNewsChanges(user, id, body.note ?? "");
        break;
      case "approve":
        item = await approveNews(user, id);
        break;
      case "reject":
        item = await rejectNews(user, id, body.note ?? "");
        break;
      case "publish":
        item = await publishNews(user, id);
        break;
      case "unpublish":
        item = await unpublishNews(user, id);
        break;
      case "start_revision":
        await startRevision(user, id);
        item = await getNewsById(id);
        break;
      case "reopen_rejected":
        await reopenRejected(user, id);
        item = await getNewsById(id);
        break;
      case "delete":
        await deleteContentItem(user, id);
        return NextResponse.json({ ok: true, deleted: true });
      case "restore_revision":
        if (!body.revisionId) throw new Error("revisionId required");
        await restoreRevision(user, id, body.revisionId);
        item = await getNewsById(id);
        break;
      case "reassign":
        if (!body.newUserId) throw new Error("newUserId required");
        await reassignAuthor(user, id, body.newUserId);
        item = await getNewsById(id);
        break;
      default:
        throw new Error("Unknown action");
    }
    if (!item) throw new Error("Not found");

    return NextResponse.json({ ok: true, item: serialize(item) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status =
      message.includes("Four-eyes") ||
      message.includes("permission") ||
      message.includes("Super Admin role required") ||
      message.includes("Only Super Admin can reassign")
        ? 403
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
