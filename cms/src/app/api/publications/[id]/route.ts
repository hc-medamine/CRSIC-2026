import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  approvePublication,
  getPublicationById,
  publishPublication,
  rejectPublication,
  requestPublicationChanges,
  submitPublication,
  unpublishPublication,
  updatePublicationDraft,
  withdrawPublication,
  type PublicationInput,
} from "@/lib/content/publications";
import { reassignAuthor, restoreRevision, startRevision } from "@/lib/content/lifecycle";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(item: NonNullable<Awaited<ReturnType<typeof getPublicationById>>>) {
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
  const item = await getPublicationById(id);
  if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
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
      fields?: PublicationInput;
      revisionId?: string;
      newUserId?: string;
    };
    let item;
    switch (body.action) {
      case "save":
        if (!body.fields) throw new Error("fields required");
        item = await updatePublicationDraft(user, id, body.fields);
        break;
      case "submit":
        item = await submitPublication(user, id, Boolean(body.checklistConfirmed));
        break;
      case "withdraw":
        item = await withdrawPublication(user, id);
        break;
      case "request_changes":
        item = await requestPublicationChanges(user, id, body.note ?? "");
        break;
      case "approve":
        item = await approvePublication(user, id);
        break;
      case "reject":
        item = await rejectPublication(user, id, body.note ?? "");
        break;
      case "publish":
        item = await publishPublication(user, id);
        break;
      case "unpublish":
        item = await unpublishPublication(user, id);
        break;
      case "start_revision":
        await startRevision(user, id);
        item = await getPublicationById(id);
        break;
      case "restore_revision":
        if (!body.revisionId) throw new Error("revisionId required");
        await restoreRevision(user, id, body.revisionId);
        item = await getPublicationById(id);
        break;
      case "reassign":
        if (!body.newUserId) throw new Error("newUserId required");
        await reassignAuthor(user, id, body.newUserId);
        item = await getPublicationById(id);
        break;
      default:
        throw new Error("Unknown action");
    }
    if (!item) throw new Error("Not found");
    return NextResponse.json({ ok: true, item: serialize(item) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status = message.includes("Four-eyes") || message.includes("permission") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
