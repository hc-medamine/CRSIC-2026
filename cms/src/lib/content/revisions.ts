import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { canAccessContentType, canAccessOrg, canReview } from "@/lib/content/permissions";
import type { ContentStatus } from "@/lib/content/news";

export type ContentRevision = {
  id: string;
  content_item_id: string;
  revision_number: number;
  status: ContentStatus;
  snapshot: Record<string, unknown>;
  change_summary: string | null;
  created_by: string;
  created_at: Date;
  author_email: string | null;
  author_display_name: string | null;
};

type ContentMeta = {
  id: string;
  content_type: "news" | "event" | "publication";
  org_unit_id: string;
  created_by: string;
};

export async function getContentMeta(id: string): Promise<ContentMeta | null> {
  const result = await query<ContentMeta>(
    `SELECT id, content_type, org_unit_id, created_by FROM content_items WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function canViewContentItem(
  user: SessionUser,
  item: ContentMeta,
): Promise<boolean> {
  if (!(await canAccessContentType(user, item.content_type))) return false;
  if (user.role === "super_admin" || canReview(user)) return true;
  if (item.created_by === user.id) return true;
  return canAccessOrg(user, item.org_unit_id);
}

export async function listRevisionsForItem(contentItemId: string): Promise<ContentRevision[]> {
  const result = await query<ContentRevision>(
    `SELECT r.id, r.content_item_id, r.revision_number, r.status, r.snapshot,
            r.change_summary, r.created_by, r.created_at,
            u.email AS author_email, u.display_name AS author_display_name
     FROM content_revisions r
     LEFT JOIN users u ON u.id = r.created_by
     WHERE r.content_item_id = $1
     ORDER BY r.revision_number DESC`,
    [contentItemId],
  );
  return result.rows;
}

export async function getRevisionById(
  contentItemId: string,
  revisionId: string,
): Promise<ContentRevision | null> {
  const result = await query<ContentRevision>(
    `SELECT r.id, r.content_item_id, r.revision_number, r.status, r.snapshot,
            r.change_summary, r.created_by, r.created_at,
            u.email AS author_email, u.display_name AS author_display_name
     FROM content_revisions r
     LEFT JOIN users u ON u.id = r.created_by
     WHERE r.content_item_id = $1 AND r.id = $2`,
    [contentItemId, revisionId],
  );
  return result.rows[0] ?? null;
}
