import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";

export type CommentKind = "general" | "changes_requested" | "rejected";

export type ContentComment = {
  id: string;
  content_item_id: string;
  author_id: string;
  body: string;
  kind: CommentKind;
  created_at: Date;
  author_email: string | null;
  author_display_name: string | null;
};

function dashboardPath(contentType: string, id: string): string {
  if (contentType === "news") return `/dashboard/news/${id}`;
  if (contentType === "event") return `/dashboard/events/${id}`;
  if (contentType === "partner") return `/dashboard/partners/${id}`;
  if (contentType === "alert") return `/dashboard/alerts/${id}`;
  if (contentType === "page") return `/dashboard/pages/${id}`;
  return `/dashboard/publications/${id}`;
}

/** Author of the item, Reviewer, or Super Admin may post (any status). */
export function canCommentOnItem(
  user: SessionUser,
  item: { created_by: string },
): boolean {
  if (user.role === "super_admin" || user.role === "reviewer") return true;
  return item.created_by === user.id;
}

export async function listCommentsForItem(
  contentItemId: string,
): Promise<ContentComment[]> {
  const result = await query<ContentComment>(
    `SELECT c.id, c.content_item_id, c.author_id, c.body, c.kind, c.created_at,
            u.email AS author_email, u.display_name AS author_display_name
     FROM content_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.content_item_id = $1
     ORDER BY c.created_at ASC`,
    [contentItemId],
  );
  return result.rows;
}

/**
 * Insert a comment. Caller must already have checked auth for general posts.
 * Used by workflow actions (request changes / reject) and by the comments API.
 */
export async function insertComment(input: {
  contentItemId: string;
  authorId: string;
  body: string;
  kind: CommentKind;
}): Promise<ContentComment> {
  const body = input.body.trim();
  if (!body) throw new Error("Comment body is required");

  const result = await query<ContentComment>(
    `INSERT INTO content_comments (content_item_id, author_id, body, kind)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content_item_id, author_id, body, kind, created_at,
               NULL::text AS author_email, NULL::text AS author_display_name`,
    [input.contentItemId, input.authorId, body, input.kind],
  );
  const row = result.rows[0];
  const withAuthor = await query<ContentComment>(
    `SELECT c.id, c.content_item_id, c.author_id, c.body, c.kind, c.created_at,
            u.email AS author_email, u.display_name AS author_display_name
     FROM content_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.id = $1`,
    [row.id],
  );
  return withAuthor.rows[0] ?? row;
}

async function notifyOnGeneralComment(
  actor: SessionUser,
  item: { id: string; content_type: string; created_by: string; title?: string },
  body: string,
) {
  const linkPath = dashboardPath(item.content_type, item.id);
  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;

  if (actor.id === item.created_by) {
    const reviewers = await query<{ id: string }>(
      `SELECT id FROM users WHERE is_active = TRUE AND role IN ('reviewer', 'super_admin') AND id <> $1`,
      [actor.id],
    );
    for (const r of reviewers.rows) {
      await createNotification({
        userId: r.id,
        type: `${item.content_type}.comment`,
        title: "New comment on content",
        body: preview,
        linkPath,
      });
    }
    return;
  }

  if (item.created_by !== actor.id) {
    await createNotification({
      userId: item.created_by,
      type: `${item.content_type}.comment`,
      title: "New comment on your content",
      body: preview,
      linkPath,
    });
  }
}

export async function addComment(
  user: SessionUser,
  contentItemId: string,
  body: string,
  kind: CommentKind = "general",
): Promise<ContentComment> {
  const meta = await getContentMeta(contentItemId);
  if (!meta) throw new Error("Not found");
  if (!(await canViewContentItem(user, meta))) {
    throw new Error("Forbidden");
  }
  if (!canCommentOnItem(user, meta)) {
    throw new Error("Only the author, Reviewer, or Super Admin can comment");
  }
  if (kind !== "general") {
    throw new Error("Only general comments can be posted via the thread");
  }

  const comment = await insertComment({
    contentItemId,
    authorId: user.id,
    body,
    kind: "general",
  });

  await notifyOnGeneralComment(user, meta, comment.body);
  return comment;
}

/** Append workflow note into the thread (request changes / reject). No extra notify. */
export async function appendWorkflowComment(
  user: SessionUser,
  contentItemId: string,
  body: string,
  kind: "changes_requested" | "rejected",
): Promise<void> {
  await insertComment({
    contentItemId,
    authorId: user.id,
    body,
    kind,
  });
}

export async function assertCanListComments(
  user: SessionUser,
  contentItemId: string,
): Promise<boolean> {
  const meta = await getContentMeta(contentItemId);
  if (!meta) return false;
  return canViewContentItem(user, meta);
}
