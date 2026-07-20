import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { canReview, getUserContentTypes, getUserOrgIds } from "@/lib/content/permissions";
import { contentPathSegment, type ContentType } from "@/lib/content/lifecycle";

export type QueueItem = {
  id: string;
  contentType: ContentType;
  title: string;
  status: string;
  orgUnitId: string;
  createdBy: string;
  authorName: string | null;
  reviewNote: string | null;
  updatedAt: string;
  href: string;
};

export type Queues = {
  awaitingReview: QueueItem[];
  needsRevision: QueueItem[];
  myDrafts: QueueItem[];
  recentlyPublished: QueueItem[];
};

type Row = {
  id: string;
  content_type: ContentType;
  title_ar: string;
  status: string;
  org_unit_id: string;
  created_by: string;
  review_note: string | null;
  updated_at: Date;
  author_display_name: string | null;
};

function toItem(row: Row): QueueItem {
  return {
    id: row.id,
    contentType: row.content_type,
    title: row.title_ar || "(untitled)",
    status: row.status,
    orgUnitId: row.org_unit_id,
    createdBy: row.created_by,
    authorName: row.author_display_name,
    reviewNote: row.review_note,
    updatedAt: row.updated_at.toISOString(),
    href: `/dashboard/${contentPathSegment(row.content_type)}/${row.id}`,
  };
}

const BASE_SELECT = `
  SELECT c.id, c.content_type, c.title_ar, c.status, c.org_unit_id, c.created_by,
         c.review_note, c.updated_at, u.display_name AS author_display_name
  FROM content_items c
  LEFT JOIN users u ON u.id = c.created_by`;

async function runQueue(where: string, params: unknown[], limit: number): Promise<QueueItem[]> {
  const result = await query<Row>(
    `${BASE_SELECT} WHERE ${where} ORDER BY c.updated_at DESC LIMIT ${limit}`,
    params,
  );
  return result.rows.map(toItem);
}

/**
 * Operational action queues for the dashboard, scoped by role/permissions:
 * - awaitingReview: submitted items (Reviewer / Super Admin only)
 * - needsRevision: changes_requested items (author, or Reviewer/Super Admin)
 * - myDrafts: the current user's drafts
 * - recentlyPublished: recently published (live) items in the user's scope
 */
export async function getQueues(user: SessionUser): Promise<Queues> {
  const reviewer = canReview(user);

  // Scope clause for non-reviewers: only their content types + org units.
  let scopeWhere = "";
  const scopeParams: unknown[] = [];
  if (!reviewer) {
    const [types, orgs] = await Promise.all([
      getUserContentTypes(user.id),
      getUserOrgIds(user.id),
    ]);
    if (types.length === 0 || orgs.length === 0) {
      // Still allow the user's own items to show in myDrafts / needsRevision.
      scopeWhere = "FALSE";
    } else {
      scopeParams.push(types, orgs);
      scopeWhere = `c.content_type = ANY($1::text[]) AND c.org_unit_id = ANY($2::text[])`;
    }
  }

  const awaitingReview = reviewer
    ? await runQueue(`c.status = 'submitted'`, [], 50)
    : [];

  const needsRevision = reviewer
    ? await runQueue(`c.status = 'changes_requested'`, [], 50)
    : await runQueue(`c.status = 'changes_requested' AND c.created_by = $1`, [user.id], 50);

  const myDrafts = await runQueue(
    `c.status IN ('draft', 'rejected') AND c.created_by = $1`,
    [user.id],
    50,
  );

  const recentlyPublished = reviewer
    ? await runQueue(`c.status = 'published'`, [], 10)
    : scopeWhere === "FALSE"
      ? []
      : await runQueue(`c.status = 'published' AND ${scopeWhere}`, scopeParams, 10);

  return { awaitingReview, needsRevision, myDrafts, recentlyPublished };
}
