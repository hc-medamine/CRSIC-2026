import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import {
  buildResearchProjectPayload,
  normalizeResearchEntries,
  rebuildPublicResearchProjectsJson,
  type PublicResearchBilingualEntry,
} from "@/lib/publish/researchProjectsJson";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";
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

async function auditResearchProject(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "research_project",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type ResearchProjectItem = {
  id: string;
  status: ContentStatus;
  org_unit_id: string;
  created_by: string;
  updated_by: string | null;
  en_status: "pending" | "ready";
  title_ar: string;
  title_en: string | null;
  research_group_id: string | null;
  research_lead_ar: string | null;
  research_lead_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  research_questions_ar: string | null;
  research_questions_en: string | null;
  research_axes: PublicResearchBilingualEntry[] | unknown;
  research_duration_ar: string | null;
  research_duration_en: string | null;
  research_impacts: PublicResearchBilingualEntry[] | unknown;
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

export type ResearchBilingualEntryInput = {
  ar: string;
  en?: string;
};

export type ResearchProjectInput = {
  orgUnitId: string;
  researchGroupId: string;
  titleAr: string;
  titleEn?: string;
  leadAr: string;
  leadEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  questionsAr?: string;
  questionsEn?: string;
  axes?: ResearchBilingualEntryInput[];
  durationAr?: string;
  durationEn?: string;
  impacts?: ResearchBilingualEntryInput[];
  enStatus?: "pending" | "ready";
} & SeoInput;

function normalizeEntriesInput(
  entries: ResearchBilingualEntryInput[] | undefined,
): PublicResearchBilingualEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: PublicResearchBilingualEntry[] = [];
  for (const entry of entries) {
    const ar = entry?.ar?.trim();
    if (!ar) continue;
    const item: PublicResearchBilingualEntry = { ar };
    if (entry.en?.trim()) item.en = entry.en.trim();
    out.push(item);
  }
  return out;
}

function snapshotOf(row: ResearchProjectItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    research_group_id: row.research_group_id,
    research_lead_ar: row.research_lead_ar,
    research_lead_en: row.research_lead_en,
    body_ar: row.body_ar,
    body_en: row.body_en,
    research_questions_ar: row.research_questions_ar,
    research_questions_en: row.research_questions_en,
    research_axes: normalizeResearchEntries(row.research_axes),
    research_duration_ar: row.research_duration_ar,
    research_duration_en: row.research_duration_en,
    research_impacts: normalizeResearchEntries(row.research_impacts),
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

function validateResearchProjectFields(input: ResearchProjectInput) {
  if (!input.titleAr.trim()) throw new Error("Project title (AR) is required");
  if (!input.leadAr.trim()) throw new Error("Lead (AR) is required");
  if (!input.researchGroupId?.trim()) throw new Error("Research group is required");
}

/** Verify the referenced research_group exists, is a research_group, and shares the same org unit. */
async function assertValidResearchGroup(researchGroupId: string, orgUnitId: string): Promise<void> {
  const result = await query<{ id: string; content_type: string; org_unit_id: string }>(
    `SELECT id, content_type, org_unit_id FROM content_items WHERE id = $1`,
    [researchGroupId],
  );
  const group = result.rows[0];
  if (!group || group.content_type !== "research_group") {
    throw new Error("Selected research group does not exist");
  }
  if (group.org_unit_id !== orgUnitId) {
    throw new Error("Research group must belong to the same organisation unit");
  }
}

export async function getResearchProjectById(id: string): Promise<ResearchProjectItem | null> {
  const result = await query<ResearchProjectItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'research_project'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listResearchProjectsForUser(user: SessionUser): Promise<ResearchProjectItem[]> {
  if (!(await canAccessContentType(user, "research_project"))) return [];
  if (user.role === "super_admin") {
    const result = await query<ResearchProjectItem>(
      `SELECT * FROM content_items WHERE content_type = 'research_project' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  if (user.role === "reviewer") {
    const orgIds = await getUserOrgIds(user.id);
    if (orgIds.length === 0) return [];
    const result = await query<ResearchProjectItem>(
      `SELECT * FROM content_items
       WHERE content_type = 'research_project' AND org_unit_id = ANY($1::text[])
       ORDER BY updated_at DESC`,
      [orgIds],
    );
    return result.rows;
  }
  const result = await query<ResearchProjectItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'research_project' AND created_by = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );
  return result.rows;
}

export async function createResearchProject(
  user: SessionUser,
  input: ResearchProjectInput,
): Promise<ResearchProjectItem> {
  if (!(await canAccessContentType(user, "research_project"))) {
    throw new Error("No research project content permission");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  await assertOrgAllowsContentType(input.orgUnitId, "research_project");
  validateResearchProjectFields(input);
  await assertValidResearchGroup(input.researchGroupId, input.orgUnitId);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const axes = normalizeEntriesInput(input.axes);
  const impacts = normalizeEntriesInput(input.impacts);
  const seo = normalizeSeoInput(input);

  const result = await query<ResearchProjectItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, research_group_id, research_lead_ar, research_lead_en,
      body_ar, body_en, research_questions_ar, research_questions_en,
      research_axes, research_duration_ar, research_duration_en, research_impacts,
      meta_title_ar, meta_title_en, meta_description_ar, meta_description_en, og_image
    ) VALUES (
      'research_project', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13::jsonb, $14, $15, $16::jsonb,
      $17, $18, $19, $20, $21
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.researchGroupId,
      input.leadAr.trim(),
      input.leadEn?.trim() || null,
      sanitizeBodyHtml(input.bodyAr),
      sanitizeBodyHtml(input.bodyEn),
      input.questionsAr?.trim() || null,
      input.questionsEn?.trim() || null,
      JSON.stringify(axes),
      input.durationAr?.trim() || null,
      input.durationEn?.trim() || null,
      JSON.stringify(impacts),
      seo.meta_title_ar,
      seo.meta_title_en,
      seo.meta_description_ar,
      seo.meta_description_en,
      seo.og_image,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditResearchProject(user, "research_project.create", item);
  return item;
}

export async function updateResearchProjectDraft(
  user: SessionUser,
  id: string,
  input: ResearchProjectInput,
) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  await assertOrgAllowsContentType(input.orgUnitId, "research_project");
  validateResearchProjectFields(input);
  await assertValidResearchGroup(input.researchGroupId, input.orgUnitId);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const axes = normalizeEntriesInput(input.axes);
  const impacts = normalizeEntriesInput(input.impacts);
  const seo = normalizeSeoInput(input);

  const result = await query<ResearchProjectItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, research_group_id = $7,
      research_lead_ar = $8, research_lead_en = $9,
      body_ar = $10, body_en = $11,
      research_questions_ar = $12, research_questions_en = $13,
      research_axes = $14::jsonb, research_duration_ar = $15, research_duration_en = $16,
      research_impacts = $17::jsonb,
      meta_title_ar = $18, meta_title_en = $19, meta_description_ar = $20,
      meta_description_en = $21, og_image = $22,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'research_project'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.researchGroupId,
      input.leadAr.trim(),
      input.leadEn?.trim() || null,
      sanitizeBodyHtml(input.bodyAr),
      sanitizeBodyHtml(input.bodyEn),
      input.questionsAr?.trim() || null,
      input.questionsEn?.trim() || null,
      JSON.stringify(axes),
      input.durationAr?.trim() || null,
      input.durationEn?.trim() || null,
      JSON.stringify(impacts),
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
  await notifyOnSubmit(itemId, title, body, linkPath, "research_project.submitted");
}

export async function submitResearchProject(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Project title (AR) is required");
  if (!existing.research_lead_ar?.trim()) throw new Error("Lead (AR) is required");
  if (!existing.research_group_id) throw new Error("Research group is required");

  const result = await query<ResearchProjectItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Research project submitted for review",
    item.title_ar,
    `/dashboard/research-projects/${item.id}`,
  );
  await auditResearchProject(user, "research_project.submit", item);
  return item;
}

export async function withdrawResearchProject(user: SessionUser, id: string) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<ResearchProjectItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditResearchProject(user, "research_project.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: ResearchProjectItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestResearchProjectChanges(user: SessionUser, id: string, note: string) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<ResearchProjectItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "research_project.changes_requested",
    title: "Changes requested on research project",
    body: note.trim(),
    linkPath: `/dashboard/research-projects/${item.id}`,
  });
  await auditResearchProject(user, "research_project.changes_requested", item, note.trim());
  return item;
}

export async function approveResearchProject(user: SessionUser, id: string) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<ResearchProjectItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "research_project.approved",
    title: "Research project approved",
    body: item.title_ar,
    linkPath: `/dashboard/research-projects/${item.id}`,
  });
  await auditResearchProject(user, "research_project.approve", item);
  return item;
}

export async function rejectResearchProject(user: SessionUser, id: string, note: string) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<ResearchProjectItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "research_project.rejected",
    title: "Research project rejected",
    body: note.trim(),
    linkPath: `/dashboard/research-projects/${item.id}`,
  });
  await auditResearchProject(user, "research_project.reject", item, note.trim());
  return item;
}

export async function publishResearchProject(user: SessionUser, id: string) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  if (!existing.research_group_id) throw new Error("Research group is required before publish");
  const slug = await resolvePublicSlug({
    itemId: existing.id,
    titleAr: existing.title_ar,
    existingSlug: existing.public_slug,
  });
  const payload = buildResearchProjectPayload({ ...existing, public_slug: slug });
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<ResearchProjectItem>(
        `UPDATE content_items SET status = 'published', public_slug = $2,
          published_at = COALESCE(published_at, NOW()),
          live_payload = $4::jsonb, live_at = NOW(),
          updated_by = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, slug, user.id, JSON.stringify(payload)],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicResearchProjectsJson,
  });
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "research_project.published",
    title: "Research project published",
    body: item.title_ar,
    linkPath: `/dashboard/research-projects/${item.id}`,
  });
  await auditResearchProject(user, "research_project.publish", item, "Published to research-projects.json");
  return item;
}

export async function unpublishResearchProject(user: SessionUser, id: string) {
  const existing = await getResearchProjectById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<ResearchProjectItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          needs_post_review = FALSE, emergency_published_at = NULL,
          emergency_published_by = NULL, emergency_reason = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicResearchProjectsJson,
  });
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "research_project.unpublished",
    title: "Research project unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/research-projects/${item.id}`,
  });
  await auditResearchProject(user, "research_project.unpublish", item, "Unpublished from research-projects.json");
  return item;
}
