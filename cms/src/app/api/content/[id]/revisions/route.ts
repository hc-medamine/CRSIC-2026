import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  canViewContentItem,
  getContentMeta,
  getRevisionById,
  listRevisionsForItem,
} from "@/lib/content/revisions";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(row: Awaited<ReturnType<typeof listRevisionsForItem>>[number]) {
  return {
    id: row.id,
    contentItemId: row.content_item_id,
    revisionNumber: row.revision_number,
    status: row.status,
    snapshot: row.snapshot,
    changeSummary: row.change_summary,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    authorEmail: row.author_email,
    authorDisplayName: row.author_display_name,
  };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const item = await getContentMeta(id);
  if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await canViewContentItem(user, item))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const revisionId = request.nextUrl.searchParams.get("revisionId");
  if (revisionId) {
    const one = await getRevisionById(id, revisionId);
    if (!one) return NextResponse.json({ ok: false, error: "Revision not found" }, { status: 404 });
    return NextResponse.json({ ok: true, revision: serialize(one) });
  }

  const revisions = await listRevisionsForItem(id);
  return NextResponse.json({ ok: true, revisions: revisions.map(serialize) });
}
