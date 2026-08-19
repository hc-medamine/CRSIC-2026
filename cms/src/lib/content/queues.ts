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
  authorNameAr: string | null;
  authorNameEn: string | null;
  reviewNote: string | null;
  updatedAt: string;
  href: string;
};

export type EditorStat = {
  editorId: string;
  editorName: string | null;
  editorNameAr: string | null;
  editorNameEn: string | null;
  /** Count per current status — each item counted once. */
  counts: Record<string, number>;
  total: number;
  /** Distinct items this user has published (from audit_log). */
  publishedCount: number;
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
  /** Per-editor item counts by current status (reviewer org-scope; all for SA). */
  editorStats: EditorStat[];
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
  author_name_ar: string | null;
  author_name_en: string | null;
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
    authorNameAr: row.author_name_ar,
    authorNameEn: row.author_name_en,
    reviewNote: row.review_note,
    updatedAt: row.updated_at.toISOString(),
    href: `/dashboard/${contentPathSegment(row.content_type)}/${row.id}`,
  };
}

const BASE_SELECT = `
  SELECT c.id, c.content_type, c.title_ar, c.status, c.org_unit_id, c.created_by,
         c.review_note, c.updated_at, u.display_name AS author_display_name,
         u.name_ar AS author_name_ar, u.name_en AS author_name_en
  FROM content_items c
  LEFT JOIN users u ON u.id = c.created_by`;

async function runQueue(where: string, params: unknown[], limit: number): Promise<QueueItem[]> {
  const result = await query<Row>(
    `${BASE_SELECT} WHERE ${where} ORDER BY c.updated_at DESC LIMIT ${limit}`,
    params,
  );
  return result.rows.map(toItem);
}

type SubmittedRow = {
  editor_id: string;
  editor_name: string | null;
  editor_name_ar: string | null;
  editor_name_en: string | null;
  status: string;
  count: string;
};

const STATUS_ORDER = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "published",
  "rejected",
];

type PublishRow = {
  actor_user_id: string;
  count: string;
};

/**
 * Distinct content items each user has published (from audit_log).
 * Pure audit-log count (no content_items join) so it survives deleted items;
 * the visible user set is already scoped by the stats table's userWhere.
 */
async function runPublishedCounts(): Promise<Map<string, number>> {
  const result = await query<PublishRow>(
    `SELECT a.actor_user_id, COUNT(DISTINCT a.entity_id)::text AS count
     FROM audit_log a
     WHERE a.action ~ '\\.(publish|emergency_publish)$'
       AND a.entity_type != 'site_director'
     GROUP BY a.actor_user_id`,
    [],
  );
  return new Map(result.rows.map((r) => [r.actor_user_id, Number(r.count)]));
}

/**
 * Per-editor item counts grouped by current status (each item counted once).
 * Starts from `users` and LEFT JOINs content so users with no items still appear with zero counts.
 *
 * Role visibility:
 * - Super Admin: every active user (editors + reviewers + SA).
 * - Reviewer: active editors + reviewers, org-scoped content, Super Admin excluded.
 * - Editor: only the editor's own row.
 */
async function runEditorStats(
  contentOn: string,
  contentParams: unknown[],
  userWhere: string,
  userParams: unknown[],
  limit: number,
  publishedCounts: Map<string, number>,
): Promise<EditorStat[]> {
  const result = await query<SubmittedRow>(
    `SELECT u.id AS editor_id,
            u.display_name AS editor_name,
            u.name_ar AS editor_name_ar,
            u.name_en AS editor_name_en,
            c.status,
            COUNT(c.id)::text AS count
     FROM users u
     LEFT JOIN content_items c ON c.created_by = u.id ${contentOn}
     WHERE ${userWhere}
     GROUP BY u.id, u.display_name, u.name_ar, u.name_en, c.status
     ORDER BY u.id ASC, c.status ASC`,
    [...contentParams, ...userParams],
  );

  const byEditor = new Map<string, EditorStat>();
  for (const row of result.rows) {
    let entry = byEditor.get(row.editor_id);
    if (!entry) {
      entry = {
        editorId: row.editor_id,
        editorName: row.editor_name,
        editorNameAr: row.editor_name_ar,
        editorNameEn: row.editor_name_en,
        counts: {},
        total: 0,
        publishedCount: publishedCounts.get(row.editor_id) ?? 0,
      };
      byEditor.set(row.editor_id, entry);
    }
    if (!row.status) continue;
    const n = Number(row.count);
    // Authored `published` items are counted as Approved — publishing is done by
    // the Reviewer/Super Admin role, whose activity lives in `publishedCount`.
    const statKey = row.status === "published" ? "approved" : row.status;
    entry.counts[statKey] = (entry.counts[statKey] ?? 0) + n;
    entry.total += n;
  }

  return [...byEditor.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export const STATUS_ORDER_COLUMNS = [...STATUS_ORDER];

function emptyQueues(): Queues {
  return {
    awaitingReview: [],
    needsRevision: [],
    myDrafts: [],
    rejected: [],
    unpublished: [],
    recentlyPublished: [],
    englishPending: [],
    editorStats: [],
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
      editorStats: await runEditorStats(
        "",
        [],
        `u.id = $1`,
        [user.id],
        20,
        await runPublishedCounts(),
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
      editorStats: await runEditorStats(
        "",
        [],
        `u.is_active = TRUE`,
        [],
        20,
        await runPublishedCounts(),
      ),
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
    editorStats: await runEditorStats(
      `AND ${orgClause}`,
      [orgIds],
      `u.is_active = TRUE AND u.role IN ('editor', 'reviewer')`,
      [],
      20,
      await runPublishedCounts(),
    ),
  };
}
