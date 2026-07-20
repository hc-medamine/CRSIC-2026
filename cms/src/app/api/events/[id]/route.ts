import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  approveEvent,
  getEventById,
  publishEvent,
  rejectEvent,
  requestEventChanges,
  submitEvent,
  unpublishEvent,
  updateEventDraft,
  withdrawEvent,
  type EventInput,
} from "@/lib/content/events";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(item: NonNullable<Awaited<ReturnType<typeof getEventById>>>) {
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
  const item = await getEventById(id);
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
      fields?: EventInput;
    };
    let item;
    switch (body.action) {
      case "save":
        if (!body.fields) throw new Error("fields required");
        item = await updateEventDraft(user, id, body.fields);
        break;
      case "submit":
        item = await submitEvent(user, id, Boolean(body.checklistConfirmed));
        break;
      case "withdraw":
        item = await withdrawEvent(user, id);
        break;
      case "request_changes":
        item = await requestEventChanges(user, id, body.note ?? "");
        break;
      case "approve":
        item = await approveEvent(user, id);
        break;
      case "reject":
        item = await rejectEvent(user, id, body.note ?? "");
        break;
      case "publish":
        item = await publishEvent(user, id);
        break;
      case "unpublish":
        item = await unpublishEvent(user, id);
        break;
      default:
        throw new Error("Unknown action");
    }
    return NextResponse.json({ ok: true, item: serialize(item) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status = message.includes("Four-eyes") || message.includes("permission") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
