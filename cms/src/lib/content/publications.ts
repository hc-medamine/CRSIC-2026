import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { rebuildPublicPublicationsJson } from "@/lib/publish/publicationsJson";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
  getUserOrgIds,
} from "@/lib/content/permissions";
import type { ContentStatus } from "@/lib/content/news";

export type PublicationItem = {
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
  pub_kind: "collective" | "individual" | null;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PublicationInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  deptAr: string;
  deptEn?: string;
  descAr: string;
  descEn?: string;
  coverPath: string;
  imageAltAr?: string;
  imageAltEn?: string;
  enStatus?: "pending" | "ready";
  pubKind: "collective" | "individual";
};

function snapshotOf(row: PublicationItem) {
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
    pub_kind: row.pub_kind,
    image_path: row.image_path,
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

function validatePublicationFields(input: PublicationInput, opts?: { requireCover?: boolean }) {
  if (!input.titleAr.trim()) throw new Error("Arabic title is required");
  if (!input.deptAr.trim()) throw new Error("Department (AR) is required");
  if (!input.descAr.trim()) throw new Error("Description (AR) is required");
  if (opts?.requireCover !== false && !input.coverPath.trim()) {
    throw new Error("Cover path is required");
  }
  if (!["collective", "individual"].includes(input.pubKind)) {
    throw new Error("Invalid publication type");
  }
}

export async function getPublicationById(id: string): Promise<PublicationItem | null> {
  const result = await query<PublicationItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'publication'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listPublicationsForUser(user: SessionUser): Promise<PublicationItem[]> {
  if (!(await canAccessContentType(user, "publication"))) return [];
  if (user.role === "super_admin" || user.role === "reviewer") {
    const result = await query<PublicationItem>(
      `SELECT * FROM content_items WHERE content_type = 'publication' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  const orgs = await getUserOrgIds(user.id);
  if (orgs.length === 0) return [];
  const result = await query<PublicationItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'publication' AND org_unit_id = ANY($1::text[])
     ORDER BY updated_at DESC`,
    [orgs],
  );
  return result.rows;
}

export async function createPublication(
  user: SessionUser,
  input: PublicationInput,
): Promise<PublicationItem> {
  if (!(await canAccessContentType(user, "publication"))) {
    throw new Error("No publication content permission");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) {
    throw new Error("No permission for this organisation unit");
  }
  validatePublicationFields(input, { requireCover: false });
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<PublicationItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, label_ar, label_en, summary_ar, summary_en,
      image_path, image_alt_ar, image_alt_en, pub_kind
    ) VALUES (
      'publication', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.deptAr.trim(),
      input.deptEn?.trim() || null,
      input.descAr.trim(),
      input.descEn?.trim() || null,
      input.coverPath.trim() || null,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
      input.pubKind,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  return item;
}

export async function updatePublicationDraft(
  user: SessionUser,
  id: string,
  input: PublicationInput,
) {
  const existing = await getPublicationById(id);
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
  validatePublicationFields(input, { requireCover: false });
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<PublicationItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, label_ar = $7, label_en = $8,
      summary_ar = $9, summary_en = $10, image_path = $11,
      image_alt_ar = $12, image_alt_en = $13, pub_kind = $14,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'publication'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.deptAr.trim(),
      input.deptEn?.trim() || null,
      input.descAr.trim(),
      input.descEn?.trim() || null,
      input.coverPath.trim() || null,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
      input.pubKind,
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
    await createNotification({ userId: r.id, type: "publication.submitted", title, body, linkPath });
  }
}

export async function submitPublication(
  user: SessionUser,
  id: string,
  checklistConfirmed: boolean,
) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Cannot submit in current status");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author can submit");
  }
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Arabic title is required");
  if (!existing.label_ar?.trim()) throw new Error("Department (AR) is required");
  if (!existing.summary_ar?.trim()) throw new Error("Description (AR) is required");
  if (!existing.image_path?.trim()) throw new Error("Cover path is required");
  if (!existing.pub_kind) throw new Error("Publication type is required");
  if (existing.image_path && !existing.image_alt_ar?.trim()) {
    throw new Error("Cover alt text (AR) is required when a cover is set");
  }

  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    "Publication submitted for review",
    item.title_ar,
    `/dashboard/publications/${item.id}`,
  );
  return item;
}

export async function withdrawPublication(user: SessionUser, id: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author can withdraw");
  }
  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  return item;
}

async function assertReviewer(user: SessionUser, item: PublicationItem) {
  if (!canReview(user)) throw new Error("Reviewer role required");
  if (item.created_by === user.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestPublicationChanges(user: SessionUser, id: string, note: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await createNotification({
    userId: item.created_by,
    type: "publication.changes_requested",
    title: "Changes requested on publication",
    body: note.trim(),
    linkPath: `/dashboard/publications/${item.id}`,
  });
  return item;
}

export async function approvePublication(user: SessionUser, id: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "publication.approved",
    title: "Publication approved",
    body: item.title_ar,
    linkPath: `/dashboard/publications/${item.id}`,
  });
  return item;
}

export async function rejectPublication(user: SessionUser, id: string, note: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await createNotification({
    userId: item.created_by,
    type: "publication.rejected",
    title: "Publication rejected",
    body: note.trim(),
    linkPath: `/dashboard/publications/${item.id}`,
  });
  return item;
}

export async function publishPublication(user: SessionUser, id: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  if (!existing.image_path?.trim()) throw new Error("Cover path is required before publish");
  const slug = existing.public_slug ?? `pub-${existing.id.slice(0, 8)}`;
  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'published', public_slug = $2,
      published_at = COALESCE(published_at, NOW()), updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, slug, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await rebuildPublicPublicationsJson();
  await createNotification({
    userId: item.created_by,
    type: "publication.published",
    title: "Publication published",
    body: item.title_ar,
    linkPath: `/dashboard/publications/${item.id}`,
  });
  return item;
}

export async function unpublishPublication(user: SessionUser, id: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const result = await query<PublicationItem>(
    `UPDATE content_items SET status = 'unpublished', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await rebuildPublicPublicationsJson();
  await createNotification({
    userId: item.created_by,
    type: "publication.unpublished",
    title: "Publication unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/publications/${item.id}`,
  });
  return item;
}
