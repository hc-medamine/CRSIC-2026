import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import { buildLawPayloadForItem, rebuildPublicLawsJson } from "@/lib/publish/lawsJson";
import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
  getUserOrgIds,
  assertOrgAllowsContentType,
} from "@/lib/content/permissions";
import { notifyOnSubmit } from "@/lib/content/delegation";
import { assertNotAwayFrozen, refreshUserFromDb } from "@/lib/content/ooo";
import { unpublishMutateMaybeRebuild, shouldNotifyUnpublish, type SilentUnpublishOpts } from "@/lib/content/silentUnpublish";
import { normalizeSeoInput, seoSnapshotFields, type SeoInput } from "@/lib/content/seo";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";
import type { ContentStatus } from "@/lib/content/news";

async function auditLaw(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "law",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type LawItem = {
  id: string;
  status: ContentStatus;
  org_unit_id: string;
  created_by: string;
  updated_by: string | null;
  en_status: "pending" | "ready";
  title_ar: string;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  image_path: string | null;
  external_url: string | null;
  attachments: unknown;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
  og_image: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type LawInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  enStatus?: "pending" | "ready";
  summaryAr?: string;
  summaryEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  imagePath?: string;
  externalUrl?: string;
  attachments?: unknown;
} & SeoInput;

function snapshotOf(row: LawItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    summary_ar: row.summary_ar,
    summary_en: row.summary_en,
    body_ar: row.body_ar,
    body_en: row.body_en,
    image_path: row.image_path,
    external_url: row.external_url,
    attachments: row.attachments,
    ...seoSnapshotFields(row),
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

function validateLawFields(input: LawInput) {
  if (!input.titleAr.trim()) throw new Error("Law title (AR) is required");
}

export async function getLawById(id: string): Promise<LawItem | null> {
  const result = await query<LawItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'law' AND recycled_at IS NULL`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listLawsForUser(user: SessionUser): Promise<LawItem[]> {
  if (!(await canAccessContentType(user, "law"))) return [];
  if (user.role === "super_admin") {
    const result = await query<LawItem>(
      `SELECT * FROM content_items WHERE content_type = 'law' AND recycled_at IS NULL ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  if (user.role === "reviewer") {
    const orgIds = await getUserOrgIds(user.id);
    if (orgIds.length === 0) return [];
    const result = await query<LawItem>(
      `SELECT * FROM content_items
       WHERE content_type = 'law' AND recycled_at IS NULL AND org_unit_id = ANY($1::text[])
       ORDER BY updated_at DESC`,
      [orgIds],
    );
    return result.rows;
  }
  const result = await query<LawItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'law' AND recycled_at IS NULL AND created_by = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );
  return result.rows;
}

export async function createLaw(user: SessionUser, input: LawInput): Promise<LawItem> {
  if (!(await canAccessContentType(user, "law"))) throw new Error("No law content permission");
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  await assertOrgAllowsContentType(input.orgUnitId, "law");
  validateLawFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const seo = normalizeSeoInput(input);

  const result = await query<LawItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, summary_ar, summary_en, body_ar, body_en,
      image_path, external_url, attachments,
      meta_title_ar, meta_title_en, meta_description_ar, meta_description_en, og_image
    ) VALUES (
      'law', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12::jsonb,
      $13, $14, $15, $16, $17
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.summaryAr?.trim() || null,
      input.summaryEn?.trim() || null,
      sanitizeBodyHtml(input.bodyAr),
      sanitizeBodyHtml(input.bodyEn),
      input.imagePath?.trim() || null,
      input.externalUrl?.trim() || null,
      JSON.stringify(input.attachments ?? []),
      seo.meta_title_ar,
      seo.meta_title_en,
      seo.meta_description_ar,
      seo.meta_description_en,
      seo.og_image,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditLaw(user, "law.create", item);
  return item;
}

export async function updateLawDraft(user: SessionUser, id: string, input: LawInput) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  await assertOrgAllowsContentType(input.orgUnitId, "law");
  validateLawFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const seo = normalizeSeoInput(input);

  const result = await query<LawItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, summary_ar = $7, summary_en = $8,
      body_ar = $9, body_en = $10,
      image_path = $11, external_url = $12, attachments = $13::jsonb,
      meta_title_ar = $14, meta_title_en = $15, meta_description_ar = $16,
      meta_description_en = $17, og_image = $18,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'law'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.summaryAr?.trim() || null,
      input.summaryEn?.trim() || null,
      sanitizeBodyHtml(input.bodyAr),
      sanitizeBodyHtml(input.bodyEn),
      input.imagePath?.trim() || null,
      input.externalUrl?.trim() || null,
      JSON.stringify(input.attachments ?? existing.attachments ?? []),
      seo.meta_title_ar,
      seo.meta_title_en,
      seo.meta_description_ar,
      seo.meta_description_en,
      seo.og_image,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(itemId: string, title: string, body: string, linkPath: string) {
  await notifyOnSubmit(itemId, title, body, linkPath, "law.submitted");
}

export async function submitLaw(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Law title (AR) is required");

  const result = await query<LawItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Law submitted for review",
    item.title_ar,
    `/dashboard/laws/${item.id}`,
  );
  await auditLaw(user, "law.submit", item);
  return item;
}

export async function withdrawLaw(user: SessionUser, id: string) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<LawItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditLaw(user, "law.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: LawItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestLawChanges(user: SessionUser, id: string, note: string) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<LawItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "law.changes_requested",
    title: "Changes requested on law",
    body: note.trim(),
    linkPath: `/dashboard/laws/${item.id}`,
  });
  await auditLaw(user, "law.changes_requested", item, note.trim());
  return item;
}

export async function approveLaw(user: SessionUser, id: string) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<LawItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "law.approved",
    title: "Law approved",
    body: item.title_ar,
    linkPath: `/dashboard/laws/${item.id}`,
  });
  await auditLaw(user, "law.approve", item);
  return item;
}

export async function rejectLaw(user: SessionUser, id: string, note: string) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<LawItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "law.rejected",
    title: "Law rejected",
    body: note.trim(),
    linkPath: `/dashboard/laws/${item.id}`,
  });
  await auditLaw(user, "law.reject", item, note.trim());
  return item;
}

/**
 * Publish a law item and rebuild data/laws.json (multiple laws may be live).
 */
export async function publishLaw(user: SessionUser, id: string) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  if (!existing.title_ar?.trim()) throw new Error("Law title is required to publish");
  const slug = await resolvePublicSlug({
    itemId: existing.id,
    titleAr: existing.title_ar,
    existingSlug: existing.public_slug,
  });
  const payload = await buildLawPayloadForItem({ ...existing, public_slug: slug });
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<LawItem>(
        `UPDATE content_items SET status = 'published', public_slug = $2,
          published_at = COALESCE(published_at, NOW()),
          live_payload = $4::jsonb, live_at = NOW(),
          updated_by = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, slug, user.id, JSON.stringify(payload)],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicLawsJson,
  });
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "law.published",
    title: "Law published",
    body: item.title_ar,
    linkPath: `/dashboard/laws/${item.id}`,
  });
  await auditLaw(user, "law.publish", item, "Published to laws.json");
  return item;
}

export async function unpublishLaw(user: SessionUser, id: string, opts: SilentUnpublishOpts = {}) {
  const existing = await getLawById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const mutate = async () => {
    const result = await query<LawItem>(
      `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
        needs_post_review = FALSE, emergency_published_at = NULL,
        emergency_published_by = NULL, emergency_reason = NULL,
        updated_by = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, user.id],
    );
    return result.rows[0];
  };
  const item = await unpublishMutateMaybeRebuild(id, mutate, rebuildPublicLawsJson, opts);
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  if (shouldNotifyUnpublish(opts)) {
    await createNotification({
      userId: item.created_by,
      type: "law.unpublished",
      title: "Law unpublished",
      body: item.title_ar,
      linkPath: `/dashboard/laws/${item.id}`,
    });
  }
  await auditLaw(user, "law.unpublish", item);
  return item;
}
