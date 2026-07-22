import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import { buildPartnerPayload, rebuildPublicPartnersJson } from "@/lib/publish/partnersJson";
import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
} from "@/lib/content/permissions";
import { notifyOnSubmit } from "@/lib/content/delegation";
import { assertNotAwayFrozen, refreshUserFromDb } from "@/lib/content/ooo";
import type { ContentStatus } from "@/lib/content/news";

async function auditPartner(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "partner",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type PartnerItem = {
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
  partner_scope: "intl" | "nat" | null;
  partner_date: string | null;
  partner_emoji: string | null;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PartnerInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  labelAr: string;
  labelEn?: string;
  enStatus?: "pending" | "ready";
  partnerScope: "intl" | "nat";
  partnerDate: string;
  partnerEmoji?: string;
};

function snapshotOf(row: PartnerItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    label_ar: row.label_ar,
    label_en: row.label_en,
    partner_scope: row.partner_scope,
    partner_date: row.partner_date,
    partner_emoji: row.partner_emoji,
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

function validatePartnerFields(input: PartnerInput) {
  if (!input.titleAr.trim()) throw new Error("Partner name (AR) is required");
  if (!input.labelAr.trim()) throw new Error("Country (AR) is required");
  if (!input.partnerDate.trim()) throw new Error("Partner date is required");
  if (!["intl", "nat"].includes(input.partnerScope)) throw new Error("Invalid partner scope");
}

export async function getPartnerById(id: string): Promise<PartnerItem | null> {
  const result = await query<PartnerItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'partner'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listPartnersForUser(user: SessionUser): Promise<PartnerItem[]> {
  if (!(await canAccessContentType(user, "partner"))) return [];
  if (user.role === "super_admin" || user.role === "reviewer") {
    const result = await query<PartnerItem>(
      `SELECT * FROM content_items WHERE content_type = 'partner' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  const result = await query<PartnerItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'partner' AND created_by = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );
  return result.rows;
}

export async function createPartner(user: SessionUser, input: PartnerInput): Promise<PartnerItem> {
  if (!(await canAccessContentType(user, "partner"))) throw new Error("No partner content permission");
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  validatePartnerFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<PartnerItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, label_ar, label_en,
      partner_scope, partner_date, partner_emoji
    ) VALUES (
      'partner', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7,
      $8, $9, $10
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.labelAr.trim(),
      input.labelEn?.trim() || null,
      input.partnerScope,
      input.partnerDate.trim(),
      input.partnerEmoji?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditPartner(user, "partner.create", item);
  return item;
}

export async function updatePartnerDraft(user: SessionUser, id: string, input: PartnerInput) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  validatePartnerFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<PartnerItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, label_ar = $7, label_en = $8,
      partner_scope = $9, partner_date = $10, partner_emoji = $11,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'partner'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.labelAr.trim(),
      input.labelEn?.trim() || null,
      input.partnerScope,
      input.partnerDate.trim(),
      input.partnerEmoji?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(itemId: string, title: string, body: string, linkPath: string) {
  await notifyOnSubmit(itemId, title, body, linkPath, "partner.submitted");
}

export async function submitPartner(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Partner name (AR) is required");
  if (!existing.label_ar?.trim()) throw new Error("Country (AR) is required");

  const result = await query<PartnerItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Partner submitted for review",
    item.title_ar,
    `/dashboard/partners/${item.id}`,
  );
  await auditPartner(user, "partner.submit", item);
  return item;
}

export async function withdrawPartner(user: SessionUser, id: string) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<PartnerItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditPartner(user, "partner.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: PartnerItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestPartnerChanges(user: SessionUser, id: string, note: string) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<PartnerItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "partner.changes_requested",
    title: "Changes requested on partner",
    body: note.trim(),
    linkPath: `/dashboard/partners/${item.id}`,
  });
  await auditPartner(user, "partner.changes_requested", item, note.trim());
  return item;
}

export async function approvePartner(user: SessionUser, id: string) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<PartnerItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "partner.approved",
    title: "Partner approved",
    body: item.title_ar,
    linkPath: `/dashboard/partners/${item.id}`,
  });
  await auditPartner(user, "partner.approve", item);
  return item;
}

export async function rejectPartner(user: SessionUser, id: string, note: string) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<PartnerItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "partner.rejected",
    title: "Partner rejected",
    body: note.trim(),
    linkPath: `/dashboard/partners/${item.id}`,
  });
  await auditPartner(user, "partner.reject", item, note.trim());
  return item;
}

export async function publishPartner(user: SessionUser, id: string) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  const payload = buildPartnerPayload(existing);
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<PartnerItem>(
        `UPDATE content_items SET status = 'published',
          published_at = COALESCE(published_at, NOW()),
          live_payload = $3::jsonb, live_at = NOW(),
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id, JSON.stringify(payload)],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicPartnersJson,
  });
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "partner.published",
    title: "Partner published",
    body: item.title_ar,
    linkPath: `/dashboard/partners/${item.id}`,
  });
  await auditPartner(user, "partner.publish", item, "Published to partners.json");
  return item;
}

export async function unpublishPartner(user: SessionUser, id: string) {
  const existing = await getPartnerById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<PartnerItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          needs_post_review = FALSE, emergency_published_at = NULL,
          emergency_published_by = NULL, emergency_reason = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicPartnersJson,
  });
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "partner.unpublished",
    title: "Partner unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/partners/${item.id}`,
  });
  await auditPartner(user, "partner.unpublish", item, "Unpublished from partners.json");
  return item;
}
