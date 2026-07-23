import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { canReview, getUserOrgIds } from "@/lib/content/permissions";
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
  rejected: QueueItem[];
  unpublished: QueueItem[];
  recentlyPublished: QueueItem[];
  /** D1: published + en_status = pending (own for editors; org-scoped for reviewer; all for SA). */
  englishPending: QueueItem[];
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

function emptyQueues(): Queues {
  return {
    awaitingReview: [],
    needsRevision: [],
    myDrafts: [],
    rejected: [],
    unpublished: [],
    recentlyPublished: [],
    englishPending: [],
  };
}

/**
 * Operational action queues scoped by role:
 * - Super Admin: all items
 * - Reviewer: items in their exclusive org scopes
 * - Editor: own items
 */
export async function getQueues(user: SessionUser): Promise<Queues> {
  const reviewer = canReview(user);
  const myDrafts = await runQueue(
    `c.status = 'draft' AND c.created_by = $1`,
    [user.id],
    50,
  );

  if (!reviewer) {
    return {
      awaitingReview: await runQueue(`c.status = 'submitted' AND c.created_by = $1`, [user.id], 50),
      needsRevision: await runQueue(
        `c.status = 'changes_requested' AND c.created_by = $1`,
        [user.id],
        50,
      ),
      myDrafts,
      rejected: await runQueue(`c.status = 'rejected' AND c.created_by = $1`, [user.id], 50),
      unpublished: await runQueue(`c.status = 'unpublished' AND c.created_by = $1`, [user.id], 50),
      recentlyPublished: await runQueue(`c.status = 'published' AND c.created_by = $1`, [user.id], 10),
      englishPending: await runQueue(
        `c.status = 'published' AND c.en_status = 'pending' AND c.created_by = $1`,
        [user.id],
        50,
      ),
    };
  }

  if (user.role === "super_admin") {
    return {
      awaitingReview: await runQueue(`c.status = 'submitted'`, [], 50),
      needsRevision: await runQueue(`c.status = 'changes_requested'`, [], 50),
      myDrafts,
      rejected: await runQueue(`c.status = 'rejected'`, [], 50),
      unpublished: await runQueue(`c.status = 'unpublished'`, [], 50),
      recentlyPublished: await runQueue(`c.status = 'published'`, [], 10),
      englishPending: await runQueue(`c.status = 'published' AND c.en_status = 'pending'`, [], 50),
    };
  }

  // Reviewer — exclusive org scopes
  const orgIds = await getUserOrgIds(user.id);
  if (orgIds.length === 0) {
    return { ...emptyQueues(), myDrafts };
  }

  const orgClause = `c.org_unit_id = ANY($1::text[])`;
  return {
    awaitingReview: await runQueue(`c.status = 'submitted' AND ${orgClause}`, [orgIds], 50),
    needsRevision: await runQueue(`c.status = 'changes_requested' AND ${orgClause}`, [orgIds], 50),
    myDrafts,
    rejected: await runQueue(`c.status = 'rejected' AND ${orgClause}`, [orgIds], 50),
    unpublished: await runQueue(`c.status = 'unpublished' AND ${orgClause}`, [orgIds], 50),
    recentlyPublished: await runQueue(`c.status = 'published' AND ${orgClause}`, [orgIds], 10),
    englishPending: await runQueue(
      `c.status = 'published' AND c.en_status = 'pending' AND ${orgClause}`,
      [orgIds],
      50,
    ),
  };
}
