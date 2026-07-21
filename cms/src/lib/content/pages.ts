import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import { buildPagePayload, rebuildSiteCopyJson, type PagePayload } from "@/lib/publish/siteCopyJson";
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
import {
  PAGE_FIELD_KEYS,
  PAGE_KEY_LABELS,
  isPageKey,
  type PageKey,
} from "@/lib/content/pageKeys";

async function auditPage(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "page",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type PageFields = { ar: Record<string, string>; en: Record<string, string> };

export type PageItem = {
  id: string;
  status: ContentStatus;
  org_unit_id: string;
  created_by: string;
  updated_by: string | null;
  en_status: "pending" | "ready";
  title_ar: string;
  title_en: string | null;
  page_key: PageKey;
  page_fields: PageFields;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreatePageInput = {
  orgUnitId: string;
  pageKey: PageKey;
  enStatus?: "pending" | "ready";
  pageFields?: PageFields;
};

export type PageInput = {
  orgUnitId: string;
  enStatus?: "pending" | "ready";
  pageFields: PageFields;
};

function snapshotOf(row: PageItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    page_key: row.page_key,
    page_fields: row.page_fields,
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

function normalizePageFields(pageKey: PageKey, fields: PageFields | undefined): PageFields {
  const allowed = new Set(PAGE_FIELD_KEYS[pageKey]);
  const out: PageFields = { ar: {}, en: {} };
  for (const lang of ["ar", "en"] as const) {
    const src = fields?.[lang] ?? {};
    for (const [key, value] of Object.entries(src)) {
      if (!allowed.has(key)) throw new Error(`Unknown page field key: ${key}`);
      if (typeof value === "string" && value.trim()) out[lang][key] = value.trim();
    }
  }
  return out;
}

function hasAnyEnglishValue(fields: PageFields): boolean {
  return Object.values(fields.en).some((v) => v.trim().length > 0);
}

export async function getPageById(id: string): Promise<PageItem | null> {
  const result = await query<PageItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'page'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listPagesForUser(user: SessionUser): Promise<PageItem[]> {
  if (!(await canAccessContentType(user, "page"))) return [];
  if (user.role === "super_admin" || user.role === "reviewer") {
    const result = await query<PageItem>(
      `SELECT * FROM content_items WHERE content_type = 'page' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  const orgs = await getUserOrgIds(user.id);
  if (orgs.length === 0) return [];
  const result = await query<PageItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'page' AND org_unit_id = ANY($1::text[])
     ORDER BY updated_at DESC`,
    [orgs],
  );
  return result.rows;
}

export async function createPage(user: SessionUser, input: CreatePageInput): Promise<PageItem> {
  if (!(await canAccessContentType(user, "page"))) throw new Error("No page content permission");
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  if (!isPageKey(input.pageKey)) throw new Error("Invalid page key");

  const pageFields = normalizePageFields(input.pageKey, input.pageFields);
  const enStatus = input.enStatus ?? (hasAnyEnglishValue(pageFields) ? "ready" : "pending");
  const labels = PAGE_KEY_LABELS[input.pageKey];

  const result = await query<PageItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, page_key, page_fields
    ) VALUES (
      'page', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7::jsonb
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      labels.ar,
      labels.en,
      input.pageKey,
      JSON.stringify(pageFields),
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditPage(user, "page.create", item);
  return item;
}

export async function updatePageDraft(user: SessionUser, id: string, input: PageInput) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");

  const pageFields = normalizePageFields(existing.page_key, input.pageFields);
  const enStatus = input.enStatus ?? (hasAnyEnglishValue(pageFields) ? "ready" : "pending");

  const result = await query<PageItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4, page_fields = $5::jsonb,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'page'
     RETURNING *`,
    [id, input.orgUnitId, user.id, enStatus, JSON.stringify(pageFields)],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(itemId: string, title: string, body: string, linkPath: string) {
  await notifyOnSubmit(itemId, title, body, linkPath, "page.submitted");
}

export async function submitPage(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");

  const result = await query<PageItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Page submitted for review",
    item.title_ar,
    `/dashboard/pages/${item.id}`,
  );
  await auditPage(user, "page.submit", item);
  return item;
}

export async function withdrawPage(user: SessionUser, id: string) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<PageItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditPage(user, "page.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: PageItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestPageChanges(user: SessionUser, id: string, note: string) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<PageItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "page.changes_requested",
    title: "Changes requested on page",
    body: note.trim(),
    linkPath: `/dashboard/pages/${item.id}`,
  });
  await auditPage(user, "page.changes_requested", item, note.trim());
  return item;
}

export async function approvePage(user: SessionUser, id: string) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<PageItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "page.approved",
    title: "Page approved",
    body: item.title_ar,
    linkPath: `/dashboard/pages/${item.id}`,
  });
  await auditPage(user, "page.approve", item);
  return item;
}

export async function rejectPage(user: SessionUser, id: string, note: string) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<PageItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "page.rejected",
    title: "Page rejected",
    body: note.trim(),
    linkPath: `/dashboard/pages/${item.id}`,
  });
  await auditPage(user, "page.reject", item, note.trim());
  return item;
}

/**
 * Publish this page. Product rule: at most ONE published row per page_key (DB partial unique
 * index), so publish here fails at the DB level if another row already holds that page_key —
 * the author/reviewer must unpublish the existing one first. Rebuild merges every published
 * page's live_payload into data/site-copy.json.
 */
export async function publishPage(user: SessionUser, id: string) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }
  const payload: PagePayload = buildPagePayload(existing);
  let item: PageItem;
  try {
    item = await mutateThenRebuildPublic({
      itemId: id,
      mutate: async () => {
        const result = await query<PageItem>(
          `UPDATE content_items SET status = 'published',
            published_at = COALESCE(published_at, NOW()),
            live_payload = $3::jsonb, live_at = NOW(),
            updated_by = $2, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [id, user.id, JSON.stringify(payload)],
        );
        return result.rows[0];
      },
      rebuild: rebuildSiteCopyJson,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("content_items_page_key_published_uidx") || message.includes("duplicate key")) {
      throw new Error(
        `Another page already holds the published "${existing.page_key}" slot — unpublish it first`,
      );
    }
    throw err;
  }
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "page.published",
    title: "Page published",
    body: item.title_ar,
    linkPath: `/dashboard/pages/${item.id}`,
  });
  await auditPage(user, "page.publish", item, "Published to site-copy.json");
  return item;
}

export async function unpublishPage(user: SessionUser, id: string) {
  const existing = await getPageById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<PageItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          needs_post_review = FALSE, emergency_published_at = NULL,
          emergency_published_by = NULL, emergency_reason = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id],
      );
      return result.rows[0];
    },
    rebuild: rebuildSiteCopyJson,
  });
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "page.unpublished",
    title: "Page unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/pages/${item.id}`,
  });
  await auditPage(user, "page.unpublish", item, "Unpublished from site-copy.json");
  return item;
}
