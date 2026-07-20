import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { rebuildPublicNewsJson } from "@/lib/publish/newsJson";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
  getUserOrgIds,
} from "@/lib/content/permissions";

export type ContentStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "published"
  | "unpublished"
  | "rejected";

export type NewsItem = {
  id: string;
  status: ContentStatus;
  org_unit_id: string;
  created_by: string;
  updated_by: string | null;
  en_status: "pending" | "ready";
  title_ar: string;
  title_en: string | null;
  label_ar: string | null;
  label_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  image_path: string | null;
  image_alt_ar: string | null;
  image_alt_en: string | null;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type NewsInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  labelAr?: string;
  labelEn?: string;
  summaryAr?: string;
  summaryEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  imagePath?: string | null;
  imageAltAr?: string;
  imageAltEn?: string;
  enStatus?: "pending" | "ready";
};

function snapshotOf(row: NewsItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    label_ar: row.label_ar,
    label_en: row.label_en,
    summary_ar: row.summary_ar,
    summary_en: row.summary_en,
    body_ar: row.body_ar,
    body_en: row.body_en,
    image_path: row.image_path,
    image_alt_ar: row.image_alt_ar,
    image_alt_en: row.image_alt_en,
  };
}

async function addRevision(
  itemId: string,
  status: ContentStatus,
  snapshot: unknown,
  userId: string,
  summary?: string,
) {
  const num = await query<{ n: number }>(
    `SELECT COALESCE(MAX(revision_number), 0) + 1 AS n
     FROM content_revisions WHERE content_item_id = $1`,
    [itemId],
  );
  await query(
    `INSERT INTO content_revisions
      (content_item_id, revision_number, status, snapshot, change_summary, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [itemId, num.rows[0].n, status, JSON.stringify(snapshot), summary ?? null, userId],
  );
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const result = await query<NewsItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'news'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listNewsForUser(user: SessionUser): Promise<NewsItem[]> {
  if (!(await canAccessContentType(user, "news"))) return [];

  if (user.role === "super_admin" || user.role === "reviewer") {
    const result = await query<NewsItem>(
      `SELECT * FROM content_items WHERE content_type = 'news'
       ORDER BY updated_at DESC`,
    );
    return result.rows;
  }

  const orgs = await getUserOrgIds(user.id);
  if (orgs.length === 0) return [];
  const result = await query<NewsItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'news' AND org_unit_id = ANY($1::text[])
     ORDER BY updated_at DESC`,
    [orgs],
  );
  return result.rows;
}

export async function createNews(user: SessionUser, input: NewsInput): Promise<NewsItem> {
  if (!(await canAccessContentType(user, "news"))) {
    throw new Error("No news content permission");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) {
    throw new Error("No permission for this organisation unit");
  }
  const titleAr = input.titleAr.trim();
  if (!titleAr) throw new Error("Arabic title is required");

  const enStatus =
    input.enStatus ??
    (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<NewsItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, label_ar, label_en, summary_ar, summary_en,
      body_ar, body_en, image_path, image_alt_ar, image_alt_en
    ) VALUES (
      'news', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      titleAr,
      input.titleEn?.trim() || null,
      input.labelAr?.trim() || null,
      input.labelEn?.trim() || null,
      input.summaryAr?.trim() || null,
      input.summaryEn?.trim() || null,
      input.bodyAr?.trim() || null,
      input.bodyEn?.trim() || null,
      input.imagePath ?? null,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  return item;
}

export async function updateNewsDraft(
  user: SessionUser,
  id: string,
  input: NewsInput,
): Promise<NewsItem> {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) {
    throw new Error("No permission for this organisation unit");
  }

  const titleAr = input.titleAr.trim();
  if (!titleAr) throw new Error("Arabic title is required");
  const enStatus =
    input.enStatus ??
    (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<NewsItem>(
    `UPDATE content_items SET
      org_unit_id = $2,
      updated_by = $3,
      en_status = $4,
      title_ar = $5,
      title_en = $6,
      label_ar = $7,
      label_en = $8,
      summary_ar = $9,
      summary_en = $10,
      body_ar = $11,
      body_en = $12,
      image_path = $13,
      image_alt_ar = $14,
      image_alt_en = $15,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'news'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      titleAr,
      input.titleEn?.trim() || null,
      input.labelAr?.trim() || null,
      input.labelEn?.trim() || null,
      input.summaryAr?.trim() || null,
      input.summaryEn?.trim() || null,
      input.bodyAr?.trim() || null,
      input.bodyEn?.trim() || null,
      input.imagePath ?? null,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(title: string, body: string, linkPath: string) {
  const reviewers = await query<{ id: string }>(
    `SELECT id FROM users WHERE is_active = TRUE AND role IN ('reviewer', 'super_admin')`,
  );
  for (const r of reviewers.rows) {
    await createNotification({
      userId: r.id,
      type: "news.submitted",
      title,
      body,
      linkPath,
    });
  }
}

export async function submitNews(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Cannot submit in current status");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author can submit");
  }
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Arabic title is required");
  if (existing.image_path && !existing.image_alt_ar?.trim()) {
    throw new Error("Image alt text (AR) is required when an image is set");
  }

  const result = await query<NewsItem>(
    `UPDATE content_items SET
      status = 'submitted',
      checklist_confirmed = TRUE,
      updated_by = $2,
      review_note = NULL,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    "News submitted for review",
    item.title_ar,
    `/dashboard/news/${item.id}`,
  );
  return item;
}

export async function withdrawNews(user: SessionUser, id: string) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author can withdraw");
  }
  const result = await query<NewsItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  return item;
}

async function assertReviewer(user: SessionUser, item: NewsItem) {
  if (!canReview(user)) throw new Error("Reviewer role required");
  if (item.created_by === user.id) {
    throw new Error("Four-eyes: you cannot review your own item");
  }
}

export async function requestNewsChanges(user: SessionUser, id: string, note: string) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");

  const result = await query<NewsItem>(
    `UPDATE content_items SET
      status = 'changes_requested',
      review_note = $2,
      updated_by = $3,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await createNotification({
    userId: item.created_by,
    type: "news.changes_requested",
    title: "Changes requested on news",
    body: note.trim(),
    linkPath: `/dashboard/news/${item.id}`,
  });
  return item;
}

export async function approveNews(user: SessionUser, id: string) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");

  const result = await query<NewsItem>(
    `UPDATE content_items SET
      status = 'approved',
      review_note = NULL,
      updated_by = $2,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "news.approved",
    title: "News approved",
    body: item.title_ar,
    linkPath: `/dashboard/news/${item.id}`,
  });
  return item;
}

export async function rejectNews(user: SessionUser, id: string, note: string) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");

  const result = await query<NewsItem>(
    `UPDATE content_items SET
      status = 'rejected',
      review_note = $2,
      updated_by = $3,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await createNotification({
    userId: item.created_by,
    type: "news.rejected",
    title: "News rejected",
    body: note.trim(),
    linkPath: `/dashboard/news/${item.id}`,
  });
  return item;
}

export async function publishNews(user: SessionUser, id: string) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }

  const slug = existing.public_slug ?? `news-${existing.id.slice(0, 8)}`;
  const result = await query<NewsItem>(
    `UPDATE content_items SET
      status = 'published',
      public_slug = $2,
      published_at = COALESCE(published_at, NOW()),
      updated_by = $3,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, slug, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await rebuildPublicNewsJson();
  await createNotification({
    userId: item.created_by,
    type: "news.published",
    title: "News published",
    body: item.title_ar,
    linkPath: `/dashboard/news/${item.id}`,
  });
  return item;
}

export async function unpublishNews(user: SessionUser, id: string) {
  const existing = await getNewsById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");

  const result = await query<NewsItem>(
    `UPDATE content_items SET
      status = 'unpublished',
      updated_by = $2,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await rebuildPublicNewsJson();
  await createNotification({
    userId: item.created_by,
    type: "news.unpublished",
    title: "News unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/news/${item.id}`,
  });
  return item;
}
