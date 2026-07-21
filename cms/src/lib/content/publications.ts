import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import {
  buildPublicationPayload,
  rebuildPublicPublicationsJson,
} from "@/lib/publish/publicationsJson";
import { normalizeAttachments, type PublicMediaItem } from "@/lib/publish/media";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
  getUserOrgIds,
} from "@/lib/content/permissions";
import { notifyOnSubmit } from "@/lib/content/delegation";
import { assertNotAwayFrozen, refreshUserFromDb } from "@/lib/content/ooo";
import type { ContentStatus } from "@/lib/content/news";

async function auditPublication(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "publication",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

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
  attachments: PublicMediaItem[] | unknown;
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
  bodyAr?: string;
  bodyEn?: string;
  coverPath: string;
  imageAltAr?: string;
  imageAltEn?: string;
  attachments?: PublicMediaItem[];
  publicSlug?: string | null;
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
    body_ar: row.body_ar,
    body_en: row.body_en,
    pub_kind: row.pub_kind,
    image_path: row.image_path,
    attachments: normalizeAttachments(row.attachments),
    public_slug: row.public_slug,
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
  const attachments = normalizeAttachments(input.attachments);
  const primaryImage =
    (attachments.find((a) => a.kind === "image")?.src ?? input.coverPath.trim()) || null;

  const result = await query<PublicationItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, label_ar, label_en, summary_ar, summary_en,
      body_ar, body_en, image_path, image_alt_ar, image_alt_en, pub_kind, attachments
    ) VALUES (
      'publication', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16::jsonb
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
      input.bodyAr?.trim() || null,
      input.bodyEn?.trim() || null,
      primaryImage,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
      input.pubKind,
      JSON.stringify(attachments),
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditPublication(user, "publication.create", item);
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
  const attachments = normalizeAttachments(input.attachments);
  const primaryImage =
    (attachments.find((a) => a.kind === "image")?.src ?? input.coverPath.trim()) || null;
  const slugOverride =
    user.role === "super_admin" && input.publicSlug !== undefined
      ? input.publicSlug
      : undefined;

  const result = await query<PublicationItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, label_ar = $7, label_en = $8,
      summary_ar = $9, summary_en = $10, body_ar = $11, body_en = $12,
      image_path = $13, image_alt_ar = $14, image_alt_en = $15, pub_kind = $16,
      attachments = $17::jsonb, public_slug = COALESCE($18, public_slug),
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
      input.bodyAr?.trim() || null,
      input.bodyEn?.trim() || null,
      primaryImage,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
      input.pubKind,
      JSON.stringify(attachments),
      slugOverride?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(itemId: string, title: string, body: string, linkPath: string) {
  await notifyOnSubmit(itemId, title, body, linkPath, "publication.submitted");
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
    item.id,
    "Publication submitted for review",
    item.title_ar,
    `/dashboard/publications/${item.id}`,
  );
  await auditPublication(user, "publication.submit", item);
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
  await auditPublication(user, "publication.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: PublicationItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
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
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "publication.changes_requested",
    title: "Changes requested on publication",
    body: note.trim(),
    linkPath: `/dashboard/publications/${item.id}`,
  });
  await auditPublication(user, "publication.changes_requested", item, note.trim());
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
  await auditPublication(user, "publication.approve", item);
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
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "publication.rejected",
    title: "Publication rejected",
    body: note.trim(),
    linkPath: `/dashboard/publications/${item.id}`,
  });
  await auditPublication(user, "publication.reject", item, note.trim());
  return item;
}

export async function publishPublication(user: SessionUser, id: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  if (!existing.image_path?.trim() && normalizeAttachments(existing.attachments).length === 0) {
    throw new Error("Cover path is required before publish");
  }
  const slug = await resolvePublicSlug({
    itemId: existing.id,
    titleAr: existing.title_ar,
    existingSlug: existing.public_slug,
  });
  const payload = buildPublicationPayload({ ...existing, public_slug: slug });
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<PublicationItem>(
        `UPDATE content_items SET status = 'published', public_slug = $2,
          published_at = COALESCE(published_at, NOW()),
          live_payload = $4::jsonb, live_at = NOW(),
          updated_by = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, slug, user.id, JSON.stringify(payload)],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicPublicationsJson,
  });
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "publication.published",
    title: "Publication published",
    body: item.title_ar,
    linkPath: `/dashboard/publications/${item.id}`,
  });
  await auditPublication(user, "publication.publish", item, "Published to publications.json");
  return item;
}

export async function unpublishPublication(user: SessionUser, id: string) {
  const existing = await getPublicationById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<PublicationItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicPublicationsJson,
  });
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "publication.unpublished",
    title: "Publication unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/publications/${item.id}`,
  });
  await auditPublication(user, "publication.unpublish", item, "Unpublished from publications.json");
  return item;
}
