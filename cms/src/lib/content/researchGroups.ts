import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import {
  buildResearchGroupPayload,
  normalizeResearchMembers,
  rebuildPublicResearchGroupsJson,
  type PublicResearchGroupMember,
} from "@/lib/publish/researchGroupsJson";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
  getUserOrgIds,
  assertOrgAllowsContentType,
} from "@/lib/content/permissions";
import { notifyOnSubmit } from "@/lib/content/delegation";
import { assertNotAwayFrozen, refreshUserFromDb } from "@/lib/content/ooo";
import { normalizeSeoInput, seoSnapshotFields, type SeoInput } from "@/lib/content/seo";
import type { ContentStatus } from "@/lib/content/news";

async function auditResearchGroup(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "research_group",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type ResearchGroupItem = {
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
  research_lead_ar: string | null;
  research_lead_en: string | null;
  research_members: PublicResearchGroupMember[] | unknown;
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

export type ResearchGroupMemberInput = {
  nameAr: string;
  nameEn?: string;
};

export type ResearchGroupInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  summaryAr: string;
  summaryEn?: string;
  leadAr: string;
  leadEn?: string;
  members?: ResearchGroupMemberInput[];
  enStatus?: "pending" | "ready";
} & SeoInput;

function normalizeMembersInput(members: ResearchGroupMemberInput[] | undefined): PublicResearchGroupMember[] {
  if (!Array.isArray(members)) return [];
  const out: PublicResearchGroupMember[] = [];
  for (const m of members) {
    const nameAr = m?.nameAr?.trim();
    if (!nameAr) continue;
    const entry: PublicResearchGroupMember = { name_ar: nameAr };
    if (m.nameEn?.trim()) entry.name_en = m.nameEn.trim();
    out.push(entry);
  }
  return out;
}

function snapshotOf(row: ResearchGroupItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    summary_ar: row.summary_ar,
    summary_en: row.summary_en,
    research_lead_ar: row.research_lead_ar,
    research_lead_en: row.research_lead_en,
    research_members: normalizeResearchMembers(row.research_members),
    public_slug: row.public_slug,
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

function validateResearchGroupFields(input: ResearchGroupInput) {
  if (!input.titleAr.trim()) throw new Error("Group name (AR) is required");
  if (!input.summaryAr.trim()) throw new Error("Summary (AR) is required");
  if (!input.leadAr.trim()) throw new Error("Lead (AR) is required");
}

export async function getResearchGroupById(id: string): Promise<ResearchGroupItem | null> {
  const result = await query<ResearchGroupItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'research_group'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listResearchGroupsForUser(user: SessionUser): Promise<ResearchGroupItem[]> {
  if (!(await canAccessContentType(user, "research_group"))) return [];
  if (user.role === "super_admin") {
    const result = await query<ResearchGroupItem>(
      `SELECT * FROM content_items WHERE content_type = 'research_group' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  if (user.role === "reviewer") {
    const orgIds = await getUserOrgIds(user.id);
    if (orgIds.length === 0) return [];
    const result = await query<ResearchGroupItem>(
      `SELECT * FROM content_items
       WHERE content_type = 'research_group' AND org_unit_id = ANY($1::text[])
       ORDER BY updated_at DESC`,
      [orgIds],
    );
    return result.rows;
  }
  const result = await query<ResearchGroupItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'research_group' AND created_by = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );
  return result.rows;
}

/** Published research groups for an org unit — used by the project form's group picker. */
export async function listPublishedResearchGroupsForOrg(orgUnitId: string): Promise<ResearchGroupItem[]> {
  const result = await query<ResearchGroupItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'research_group' AND org_unit_id = $1 AND status = 'published'
     ORDER BY title_ar ASC`,
    [orgUnitId],
  );
  return result.rows;
}

/** All research groups (any status) for an org unit — Super Admin picker only. */
export async function listAllResearchGroupsForOrg(orgUnitId: string): Promise<ResearchGroupItem[]> {
  const result = await query<ResearchGroupItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'research_group' AND org_unit_id = $1
     ORDER BY title_ar ASC`,
    [orgUnitId],
  );
  return result.rows;
}

export async function createResearchGroup(
  user: SessionUser,
  input: ResearchGroupInput,
): Promise<ResearchGroupItem> {
  if (!(await canAccessContentType(user, "research_group"))) {
    throw new Error("No research group content permission");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  await assertOrgAllowsContentType(input.orgUnitId, "research_group");
  validateResearchGroupFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const members = normalizeMembersInput(input.members);
  const seo = normalizeSeoInput(input);

  const result = await query<ResearchGroupItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, summary_ar, summary_en,
      research_lead_ar, research_lead_en, research_members,
      meta_title_ar, meta_title_en, meta_description_ar, meta_description_en, og_image
    ) VALUES (
      'research_group', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7,
      $8, $9, $10::jsonb,
      $11, $12, $13, $14, $15
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.summaryAr.trim(),
      input.summaryEn?.trim() || null,
      input.leadAr.trim(),
      input.leadEn?.trim() || null,
      JSON.stringify(members),
      seo.meta_title_ar,
      seo.meta_title_en,
      seo.meta_description_ar,
      seo.meta_description_en,
      seo.og_image,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditResearchGroup(user, "research_group.create", item);
  return item;
}

export async function updateResearchGroupDraft(
  user: SessionUser,
  id: string,
  input: ResearchGroupInput,
) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  await assertOrgAllowsContentType(input.orgUnitId, "research_group");
  validateResearchGroupFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const members = normalizeMembersInput(input.members);
  const seo = normalizeSeoInput(input);

  const result = await query<ResearchGroupItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, summary_ar = $7, summary_en = $8,
      research_lead_ar = $9, research_lead_en = $10, research_members = $11::jsonb,
      meta_title_ar = $12, meta_title_en = $13, meta_description_ar = $14,
      meta_description_en = $15, og_image = $16,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'research_group'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.summaryAr.trim(),
      input.summaryEn?.trim() || null,
      input.leadAr.trim(),
      input.leadEn?.trim() || null,
      JSON.stringify(members),
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
  await notifyOnSubmit(itemId, title, body, linkPath, "research_group.submitted");
}

export async function submitResearchGroup(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Group name (AR) is required");
  if (!existing.summary_ar?.trim()) throw new Error("Summary (AR) is required");
  if (!existing.research_lead_ar?.trim()) throw new Error("Lead (AR) is required");

  const result = await query<ResearchGroupItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Research group submitted for review",
    item.title_ar,
    `/dashboard/research-groups/${item.id}`,
  );
  await auditResearchGroup(user, "research_group.submit", item);
  return item;
}

export async function withdrawResearchGroup(user: SessionUser, id: string) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<ResearchGroupItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditResearchGroup(user, "research_group.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: ResearchGroupItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestResearchGroupChanges(user: SessionUser, id: string, note: string) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<ResearchGroupItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "research_group.changes_requested",
    title: "Changes requested on research group",
    body: note.trim(),
    linkPath: `/dashboard/research-groups/${item.id}`,
  });
  await auditResearchGroup(user, "research_group.changes_requested", item, note.trim());
  return item;
}

export async function approveResearchGroup(user: SessionUser, id: string) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<ResearchGroupItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "research_group.approved",
    title: "Research group approved",
    body: item.title_ar,
    linkPath: `/dashboard/research-groups/${item.id}`,
  });
  await auditResearchGroup(user, "research_group.approve", item);
  return item;
}

export async function rejectResearchGroup(user: SessionUser, id: string, note: string) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<ResearchGroupItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "research_group.rejected",
    title: "Research group rejected",
    body: note.trim(),
    linkPath: `/dashboard/research-groups/${item.id}`,
  });
  await auditResearchGroup(user, "research_group.reject", item, note.trim());
  return item;
}

export async function publishResearchGroup(user: SessionUser, id: string) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  const slug = await resolvePublicSlug({
    itemId: existing.id,
    titleAr: existing.title_ar,
    existingSlug: existing.public_slug,
  });
  const payload = buildResearchGroupPayload({ ...existing, public_slug: slug });
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<ResearchGroupItem>(
        `UPDATE content_items SET status = 'published', public_slug = $2,
          published_at = COALESCE(published_at, NOW()),
          live_payload = $4::jsonb, live_at = NOW(),
          updated_by = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, slug, user.id, JSON.stringify(payload)],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicResearchGroupsJson,
  });
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "research_group.published",
    title: "Research group published",
    body: item.title_ar,
    linkPath: `/dashboard/research-groups/${item.id}`,
  });
  await auditResearchGroup(user, "research_group.publish", item, "Published to research-groups.json");
  return item;
}

export async function unpublishResearchGroup(user: SessionUser, id: string) {
  const existing = await getResearchGroupById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<ResearchGroupItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          needs_post_review = FALSE, emergency_published_at = NULL,
          emergency_published_by = NULL, emergency_reason = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicResearchGroupsJson,
  });
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "research_group.unpublished",
    title: "Research group unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/research-groups/${item.id}`,
  });
  await auditResearchGroup(user, "research_group.unpublish", item, "Unpublished from research-groups.json");
  return item;
}
