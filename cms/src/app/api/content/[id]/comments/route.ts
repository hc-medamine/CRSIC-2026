import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  addComment,
  assertCanListComments,
  canCommentOnItem,
  listCommentsForItem,
  type ContentComment,
} from "@/lib/content/comments";
import { getContentMeta } from "@/lib/content/revisions";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(row: ContentComment) {
  return {
    id: row.id,
    contentItemId: row.content_item_id,
    authorId: row.author_id,
    body: row.body,
    kind: row.kind,
    createdAt: row.created_at.toISOString(),
    authorEmail: row.author_email,
    authorDisplayName: row.author_display_name,
  };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  if (!(await assertCanListComments(user, id))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const meta = await getContentMeta(id);
  if (!meta) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const comments = await listCommentsForItem(id);
  return NextResponse.json({
    ok: true,
    comments: comments.map(serialize),
    canComment: canCommentOnItem(user, meta),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  try {
    const body = (await request.json()) as { body?: string };
    const comment = await addComment(user, id, body.body ?? "");
    return NextResponse.json({ ok: true, comment: serialize(comment) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add comment";
    const status =
      message.includes("Forbidden") || message.includes("Only the author")
        ? 403
        : message.includes("Not found")
          ? 404
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
