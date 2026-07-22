import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import { buildAlertPayload, rebuildPublicAlertsJson } from "@/lib/publish/alertsJson";
import { captureLiveState, restoreLiveState } from "@/lib/publish/safeRebuild";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
} from "@/lib/content/permissions";
import { notifyOnSubmit } from "@/lib/content/delegation";
import { assertNotAwayFrozen, refreshUserFromDb } from "@/lib/content/ooo";
import type { ContentStatus } from "@/lib/content/news";

async function auditAlert(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "alert",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type AlertItem = {
  id: string;
  status: ContentStatus;
  org_unit_id: string;
  created_by: string;
  updated_by: string | null;
  en_status: "pending" | "ready";
  title_ar: string;
  title_en: string | null;
  alert_link_url: string | null;
  alert_link_label_ar: string | null;
  alert_link_label_en: string | null;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type AlertInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  enStatus?: "pending" | "ready";
  alertLinkUrl?: string;
  alertLinkLabelAr?: string;
  alertLinkLabelEn?: string;
};

function snapshotOf(row: AlertItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    alert_link_url: row.alert_link_url,
    alert_link_label_ar: row.alert_link_label_ar,
    alert_link_label_en: row.alert_link_label_en,
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

function validateAlertFields(input: AlertInput) {
  if (!input.titleAr.trim()) throw new Error("Alert message (AR) is required");
}

export async function getAlertById(id: string): Promise<AlertItem | null> {
  const result = await query<AlertItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'alert'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listAlertsForUser(user: SessionUser): Promise<AlertItem[]> {
  if (!(await canAccessContentType(user, "alert"))) return [];
  if (user.role === "super_admin" || user.role === "reviewer") {
    const result = await query<AlertItem>(
      `SELECT * FROM content_items WHERE content_type = 'alert' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  const result = await query<AlertItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'alert' AND created_by = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );
  return result.rows;
}

export async function createAlert(user: SessionUser, input: AlertInput): Promise<AlertItem> {
  if (!(await canAccessContentType(user, "alert"))) throw new Error("No alert content permission");
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  validateAlertFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<AlertItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, alert_link_url, alert_link_label_ar, alert_link_label_en
    ) VALUES (
      'alert', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.alertLinkUrl?.trim() || null,
      input.alertLinkLabelAr?.trim() || null,
      input.alertLinkLabelEn?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditAlert(user, "alert.create", item);
  return item;
}

export async function updateAlertDraft(user: SessionUser, id: string, input: AlertInput) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  validateAlertFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");

  const result = await query<AlertItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, alert_link_url = $7,
      alert_link_label_ar = $8, alert_link_label_en = $9,
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'alert'
     RETURNING *`,
    [
      id,
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.alertLinkUrl?.trim() || null,
      input.alertLinkLabelAr?.trim() || null,
      input.alertLinkLabelEn?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(itemId: string, title: string, body: string, linkPath: string) {
  await notifyOnSubmit(itemId, title, body, linkPath, "alert.submitted");
}

export async function submitAlert(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Alert message (AR) is required");

  const result = await query<AlertItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Alert submitted for review",
    item.title_ar,
    `/dashboard/alerts/${item.id}`,
  );
  await auditAlert(user, "alert.submit", item);
  return item;
}

export async function withdrawAlert(user: SessionUser, id: string) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<AlertItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditAlert(user, "alert.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: AlertItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestAlertChanges(user: SessionUser, id: string, note: string) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<AlertItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "alert.changes_requested",
    title: "Changes requested on alert",
    body: note.trim(),
    linkPath: `/dashboard/alerts/${item.id}`,
  });
  await auditAlert(user, "alert.changes_requested", item, note.trim());
  return item;
}

export async function approveAlert(user: SessionUser, id: string) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<AlertItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "alert.approved",
    title: "Alert approved",
    body: item.title_ar,
    linkPath: `/dashboard/alerts/${item.id}`,
  });
  await auditAlert(user, "alert.approve", item);
  return item;
}

export async function rejectAlert(user: SessionUser, id: string, note: string) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<AlertItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "alert.rejected",
    title: "Alert rejected",
    body: note.trim(),
    linkPath: `/dashboard/alerts/${item.id}`,
  });
  await auditAlert(user, "alert.reject", item, note.trim());
  return item;
}

/**
 * Publish this alert. Product rule: at most ONE published alert at a time, so any other
 * currently-published alert is unpublished (status → unpublished, live_payload cleared)
 * before this one goes live. A single alerts.json rebuild covers both changes; if the
 * rebuild fails, every affected row's live columns are rolled back.
 */
export async function publishAlert(user: SessionUser, id: string) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (!["approved", "unpublished"].includes(existing.status)) {
    throw new Error("Only approved or unpublished items can be published");
  }

  const others = await query<{ id: string; title_ar: string }>(
    `SELECT id, title_ar FROM content_items
     WHERE content_type = 'alert' AND status = 'published' AND id <> $1`,
    [id],
  );

  const beforeStates = new Map<string, Awaited<ReturnType<typeof captureLiveState>>>();
  for (const affectedId of [id, ...others.rows.map((r) => r.id)]) {
    beforeStates.set(affectedId, await captureLiveState(affectedId));
  }

  const payload = buildAlertPayload(existing);

  try {
    for (const other of others.rows) {
      const unpublished = await query<AlertItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          needs_post_review = FALSE, emergency_published_at = NULL,
          emergency_published_by = NULL, emergency_reason = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [other.id, user.id],
      );
      const row = unpublished.rows[0];
      await addRevision(row.id, "unpublished", snapshotOf(row), user.id, "Unpublished (superseded by new alert publish)");
      await auditAlert(user, "alert.unpublish", row, "Unpublished — superseded by new published alert");
    }

    const result = await query<AlertItem>(
      `UPDATE content_items SET status = 'published',
        published_at = COALESCE(published_at, NOW()),
        live_payload = $3::jsonb, live_at = NOW(),
        updated_by = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, user.id, JSON.stringify(payload)],
    );
    const item = result.rows[0];

    await rebuildPublicAlertsJson();

    await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
    await createNotification({
      userId: item.created_by,
      type: "alert.published",
      title: "Alert published",
      body: item.title_ar,
      linkPath: `/dashboard/alerts/${item.id}`,
    });
    await auditAlert(user, "alert.publish", item, "Published to alerts.json");
    return item;
  } catch (err) {
    for (const [affectedId, state] of beforeStates) {
      await restoreLiveState(affectedId, state);
    }
    throw err;
  }
}

export async function unpublishAlert(user: SessionUser, id: string) {
  const existing = await getAlertById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const before = await captureLiveState(id);
  const result = await query<AlertItem>(
    `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
      needs_post_review = FALSE, emergency_published_at = NULL,
      emergency_published_by = NULL, emergency_reason = NULL,
      updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  try {
    await rebuildPublicAlertsJson();
  } catch (err) {
    await restoreLiveState(id, before);
    throw err;
  }
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "alert.unpublished",
    title: "Alert unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/alerts/${item.id}`,
  });
  await auditAlert(user, "alert.unpublish", item, "Unpublished from alerts.json");
  return item;
}
