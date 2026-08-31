import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  approveLaw,
  getLawById,
  publishLaw,
  rejectLaw,
  requestLawChanges,
  submitLaw,
  unpublishLaw,
  updateLawDraft,
  withdrawLaw,
  type LawInput,
} from "@/lib/content/laws";
import { recycleContentItem } from "@/lib/content/recycleBin";
import {
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

function serialize(item: NonNullable<Awaited<ReturnType<typeof getLawById>>>) {
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
  const item = await getLawById(id);
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
      fields?: LawInput;
      revisionId?: string;
      newUserId?: string;
    };
    let item;
    switch (body.action) {
      case "save":
        if (!body.fields) throw new Error("fields required");
        item = await updateLawDraft(user, id, body.fields);
        break;
      case "submit":
        if (body.fields) {
          await updateLawDraft(user, id, body.fields);
        }
        item = await submitLaw(user, id, Boolean(body.checklistConfirmed));
        break;
      case "withdraw":
        item = await withdrawLaw(user, id);
        break;
      case "request_changes":
        item = await requestLawChanges(user, id, body.note ?? "");
        break;
      case "approve":
        item = await approveLaw(user, id);
        break;
      case "reject":
        item = await rejectLaw(user, id, body.note ?? "");
        break;
      case "publish":
        item = await publishLaw(user, id);
        break;
      case "unpublish":
        item = await unpublishLaw(user, id);
        break;
      case "start_revision":
        await startRevision(user, id);
        item = await getLawById(id);
        break;
      case "reopen_rejected":
        await reopenRejected(user, id);
        item = await getLawById(id);
        break;
      case "delete":
        await recycleContentItem(user, id);
        return NextResponse.json({ ok: true, deleted: true });
      case "restore_revision":
        if (!body.revisionId) throw new Error("revisionId required");
        await restoreRevision(user, id, body.revisionId);
        item = await getLawById(id);
        break;
      case "reassign":
        if (!body.newUserId) throw new Error("newUserId required");
        await reassignAuthor(user, id, body.newUserId);
        item = await getLawById(id);
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
