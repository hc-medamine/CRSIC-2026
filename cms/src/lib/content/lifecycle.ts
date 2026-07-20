import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { canReview } from "@/lib/content/permissions";
import { getContentMeta, getRevisionById } from "@/lib/content/revisions";

export type ContentType = "news" | "event" | "publication";

/** Columns that make up an editable content snapshot (superset across all three types). */
const SNAPSHOT_COLUMNS = [
  "status",
  "org_unit_id",
  "en_status",
  "title_ar",
  "title_en",
  "label_ar",
  "label_en",
  "summary_ar",
  "summary_en",
  "body_ar",
  "body_en",
  "image_path",
  "image_alt_ar",
  "image_alt_en",
  "pub_kind",
  "event_scope",
  "event_day",
  "event_month",
  "event_year",
  "event_type_ar",
  "event_type_en",
  "event_display_status",
] as const;

/** Columns that a restore is allowed to overwrite from a prior snapshot (never status here). */
const RESTORABLE_COLUMNS = SNAPSHOT_COLUMNS.filter((c) => c !== "status");

export function contentPathSegment(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  return "publications";
}

async function captureSnapshot(itemId: string): Promise<Record<string, unknown>> {
  const cols = SNAPSHOT_COLUMNS.join(", ");
  const row = await query<Record<string, unknown>>(
    `SELECT ${cols} FROM content_items WHERE id = $1`,
    [itemId],
  );
  return row.rows[0] ?? {};
}

async function addRevision(
  itemId: string,
  status: string,
  snapshot: Record<string, unknown>,
  userId: string,
  summary: string,
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
    [itemId, num.rows[0].n, status, JSON.stringify(snapshot), summary, userId],
  );
}

type ItemRow = {
  id: string;
  content_type: ContentType;
  status: string;
  created_by: string;
  title_ar: string;
};

async function getItemRow(id: string): Promise<ItemRow | null> {
  const result = await query<ItemRow>(
    `SELECT id, content_type, status, created_by, title_ar FROM content_items WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

/**
 * Gap #5 — "Create revision (public stays live)".
 * From `published`: set status back to `draft` WITHOUT clearing live_payload, so the public
 * JSON keeps serving the last published copy until a new publish replaces it.
 */
export async function startRevision(user: SessionUser, id: string): Promise<ContentType> {
  const item = await getItemRow(id);
  if (!item) throw new Error("Not found");
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  if (!isAuthor && !canReview(user)) {
    throw new Error("Only the author, a Reviewer, or Super Admin can start a revision");
  }
  if (item.status !== "published") {
    throw new Error("Only published items can start a revision");
  }

  await query(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, user.id],
  );
  const snapshot = await captureSnapshot(id);
  await addRevision(id, "draft", snapshot, user.id, "Started revision (public stays live)");
  await writeAudit({
    actor: user,
    action: `${item.content_type}.start_revision`,
    entityType: item.content_type,
    entityId: id,
    summary: `Started revision (public stays live) — ${item.title_ar}`,
    metadata: { title: item.title_ar },
  });
  return item.content_type;
}

/**
 * Gap #4 — restore a prior revision's snapshot onto the editable fields.
 * Reviewer or Super Admin only. Applies the snapshot fields and sets status to `draft`;
 * live_payload (public copy) is left untouched.
 */
export async function restoreRevision(
  user: SessionUser,
  id: string,
  revisionId: string,
): Promise<ContentType> {
  const item = await getItemRow(id);
  if (!item) throw new Error("Not found");
  if (!canReview(user)) {
    throw new Error("Reviewer or Super Admin role required to restore a revision");
  }
  const revision = await getRevisionById(id, revisionId);
  if (!revision) throw new Error("Revision not found");

  const snap = revision.snapshot ?? {};
  const setKeys = RESTORABLE_COLUMNS.filter((c) => c in snap);
  const setClauses = setKeys.map((c, i) => `${c} = $${i + 3}`);
  setClauses.push(`status = 'draft'`);
  setClauses.push(`updated_by = $2`);
  setClauses.push(`updated_at = NOW()`);
  const values = [id, user.id, ...setKeys.map((c) => snap[c] ?? null)];

  await query(
    `UPDATE content_items SET ${setClauses.join(", ")} WHERE id = $1`,
    values,
  );

  const snapshot = await captureSnapshot(id);
  await addRevision(
    id,
    "draft",
    snapshot,
    user.id,
    `Restored from revision #${revision.revision_number}`,
  );
  await writeAudit({
    actor: user,
    action: `${item.content_type}.restore_revision`,
    entityType: item.content_type,
    entityId: id,
    summary: `Restored revision #${revision.revision_number} — ${item.title_ar}`,
    metadata: { title: item.title_ar, revisionNumber: revision.revision_number },
  });
  return item.content_type;
}

/**
 * Author (or Super Admin) reopens a rejected item as draft so it can be edited and resubmitted.
 */
export async function reopenRejected(user: SessionUser, id: string): Promise<ContentType> {
  const item = await getItemRow(id);
  if (!item) throw new Error("Not found");
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  if (!isAuthor) throw new Error("Only the author (or Super Admin) can reopen a rejected item");
  if (item.status !== "rejected") throw new Error("Only rejected items can be reopened");

  await query(
    `UPDATE content_items SET status = 'draft', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, user.id],
  );
  const snapshot = await captureSnapshot(id);
  await addRevision(id, "draft", snapshot, user.id, "Reopened rejected item as draft");
  await writeAudit({
    actor: user,
    action: `${item.content_type}.reopen_rejected`,
    entityType: item.content_type,
    entityId: id,
    summary: `Reopened rejected item as draft — ${item.title_ar}`,
    metadata: { title: item.title_ar },
  });
  return item.content_type;
}

export type AssignableUser = {
  id: string;
  display_name: string;
  email: string;
  role: string;
};

/** Active users a draft can be reassigned to. */
export async function listAssignableUsers(): Promise<AssignableUser[]> {
  const result = await query<AssignableUser>(
    `SELECT id, display_name, email, role
     FROM users
     WHERE is_active = TRUE
     ORDER BY display_name ASC`,
  );
  return result.rows;
}

/**
 * Gap #6 — reassign authorship of an in-progress item to another active user.
 * Super Admin or Reviewer; only for draft / changes_requested / submitted items.
 */
export async function reassignAuthor(
  user: SessionUser,
  id: string,
  newUserId: string,
): Promise<ContentType> {
  if (user.role !== "super_admin" && user.role !== "reviewer") {
    throw new Error("Super Admin or Reviewer role required to reassign");
  }
  const meta = await getContentMeta(id);
  if (!meta) throw new Error("Not found");
  const item = await getItemRow(id);
  if (!item) throw new Error("Not found");
  if (!["draft", "changes_requested", "submitted"].includes(item.status)) {
    throw new Error("Only draft, changes_requested, or submitted items can be reassigned");
  }

  const target = await query<{ id: string; is_active: boolean; display_name: string }>(
    `SELECT id, is_active, display_name FROM users WHERE id = $1`,
    [newUserId],
  );
  const targetRow = target.rows[0];
  if (!targetRow) throw new Error("Target user not found");
  if (!targetRow.is_active) throw new Error("Target user is not active");

  const previous = item.created_by;
  await query(
    `UPDATE content_items SET created_by = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1`,
    [id, newUserId, user.id],
  );

  await writeAudit({
    actor: user,
    action: "content.reassign",
    entityType: item.content_type,
    entityId: id,
    summary: `Reassigned "${item.title_ar}" to ${targetRow.display_name}`,
    metadata: { from: previous, to: newUserId, title: item.title_ar },
  });

  if (newUserId !== user.id) {
    await createNotification({
      userId: newUserId,
      type: `${item.content_type}.reassigned`,
      title: "Item assigned to you",
      body: item.title_ar,
      linkPath: `/dashboard/${contentPathSegment(item.content_type)}/${id}`,
    });
  }

  return item.content_type;
}
