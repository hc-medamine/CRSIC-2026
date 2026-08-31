import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { canReview } from "@/lib/content/permissions";
import { getContentMeta, getRevisionById } from "@/lib/content/revisions";
import { assertNotAwayFrozen } from "@/lib/content/ooo";
import { SEO_SNAPSHOT_COLUMNS } from "@/lib/content/seo";

export type ContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project"
  | "law"
  | "platform";

/** Columns that make up an editable content snapshot (superset across content types). */
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
  "image_card_path",
  "image_alt_ar",
  "image_alt_en",
  "attachments",
  "pub_kind",
  "event_scope",
  "event_day",
  "event_month",
  "event_year",
  "event_type_ar",
  "event_type_en",
  "event_display_status",
  "partner_scope",
  "partner_date",
  "partner_emoji",
  "alert_link_url",
  "alert_link_label_ar",
  "alert_link_label_en",
  "external_url",
  "platform_kind",
  "research_group_id",
  "research_lead_ar",
  "research_lead_en",
  "research_questions_ar",
  "research_questions_en",
  "research_duration_ar",
  "research_duration_en",
  "research_members",
  "research_axes",
  "research_impacts",
  ...SEO_SNAPSHOT_COLUMNS,
] as const;

/** Exported for parity-guard tests (must stay in sync with SNAPSHOT_COLUMNS). */
export const CONTENT_SNAPSHOT_COLUMNS: readonly string[] = SNAPSHOT_COLUMNS;

/** Restorable editable columns (excludes status). Exported for parity tests. */
export const CONTENT_RESTORABLE_COLUMNS: readonly string[] = SNAPSHOT_COLUMNS.filter(
  (c) => c !== "status",
);

/**
 * JSONB columns on content_items that must never be overwritten by restore.
 * - live_payload: public live copy (Gap #4 / #5 — restore leaves it untouched)
 */
export const JSONB_RESTORE_EXCLUDE: ReadonlySet<string> = new Set(["live_payload"]);

/** Editable JSONB snapshot fields — restore UPDATE must cast these as ::jsonb. */
const JSONB_SNAPSHOT_COLUMNS: ReadonlySet<string> = new Set([
  "attachments",
  "research_members",
  "research_axes",
  "research_impacts",
]);

/** Columns that a restore is allowed to overwrite from a prior snapshot (never status here). */
const RESTORABLE_COLUMNS = CONTENT_RESTORABLE_COLUMNS;

function restoreValueSql(column: string, paramIndex: number): string {
  if (JSONB_SNAPSHOT_COLUMNS.has(column)) {
    return `${column} = $${paramIndex}::jsonb`;
  }
  return `${column} = $${paramIndex}`;
}

function serializeRestoreValue(column: string, value: unknown): unknown {
  if (!JSONB_SNAPSHOT_COLUMNS.has(column)) return value ?? null;
  if (value == null) return "[]";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function contentPathSegment(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  if (type === "publication") return "publications";
  if (type === "partner") return "partners";
  if (type === "research_group") return "research-groups";
  if (type === "research_project") return "research-projects";
  if (type === "law") return "laws";
  if (type === "platform") return "platforms";
  return "alerts";
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
  recycled_at: Date | null;
};

async function getItemRow(id: string): Promise<ItemRow | null> {
  const result = await query<ItemRow>(
    `SELECT id, content_type, status, created_by, title_ar, recycled_at
     FROM content_items WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row || row.recycled_at) return null;
  return row;
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
  const setClauses = setKeys.map((c, i) => restoreValueSql(c, i + 3));
  setClauses.push(`status = 'draft'`);
  setClauses.push(`updated_by = $2`);
  setClauses.push(`updated_at = NOW()`);
  const values = [id, user.id, ...setKeys.map((c) => serializeRestoreValue(c, snap[c]))];

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
  name_ar: string | null;
  name_en: string | null;
  email: string;
  role: string;
};

/** Active users a draft can be reassigned to.
 * Rule B: Reviewers see Editors + Reviewers only; Super Admin sees everyone (incl. SA).
 */
export async function listAssignableUsers(
  actor: SessionUser,
  contentItemId?: string,
): Promise<AssignableUser[]> {
  if (contentItemId) {
    return listAssignableUsersForItem(actor, contentItemId);
  }
  const result = await query<AssignableUser>(
    actor.role === "super_admin"
      ? `SELECT id, display_name, name_ar, name_en, email, role
         FROM users
         WHERE is_active = TRUE
         ORDER BY display_name ASC`
      : `SELECT id, display_name, name_ar, name_en, email, role
         FROM users
         WHERE is_active = TRUE
           AND role IN ('editor', 'reviewer')
         ORDER BY display_name ASC`,
  );
  return result.rows;
}

/** Editors scoped to the item's org + content type (Reviewers); SA sees all active users. */
export async function listAssignableUsersForItem(
  actor: SessionUser,
  contentItemId: string,
): Promise<AssignableUser[]> {
  const meta = await getContentMeta(contentItemId);
  if (!meta) throw new Error("Not found");

  if (actor.role === "super_admin") {
    const result = await query<AssignableUser>(
      `SELECT id, display_name, name_ar, name_en, email, role
       FROM users
       WHERE is_active = TRUE
       ORDER BY display_name ASC`,
    );
    return result.rows;
  }

  if (actor.role !== "reviewer") {
    throw new Error("Forbidden");
  }

  const result = await query<AssignableUser>(
    `SELECT DISTINCT u.id, u.display_name, u.name_ar, u.name_en, u.email, u.role
     FROM editor_content_type_claims ect
     JOIN users u ON u.id = ect.editor_id
     WHERE u.is_active = TRUE
       AND u.role = 'editor'
       AND ect.content_type = $1
       AND ect.org_unit_id = $2
     ORDER BY u.display_name ASC`,
    [meta.content_type, meta.org_unit_id],
  );
  return result.rows;
}

/**
 * Gap #6 — reassign authorship of an in-progress item to another active user.
 * Super Admin or Reviewer; only for draft / changes_requested / submitted items.
 * Reviewers cannot reassign to a Super Admin (only Super Admin may).
 */
export async function reassignAuthor(
  user: SessionUser,
  id: string,
  newUserId: string,
): Promise<ContentType> {
  await assertNotAwayFrozen(user);
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

  const target = await query<{
    id: string;
    is_active: boolean;
    display_name: string;
    role: string;
  }>(`SELECT id, is_active, display_name, role FROM users WHERE id = $1`, [newUserId]);
  const targetRow = target.rows[0];
  if (!targetRow) throw new Error("Target user not found");
  if (!targetRow.is_active) throw new Error("Target user is not active");
  if (targetRow.role === "super_admin" && user.role !== "super_admin") {
    throw new Error("Only Super Admin can reassign to a Super Admin");
  }

  if (user.role === "reviewer") {
    const assignable = await listAssignableUsersForItem(user, id);
    if (!assignable.some((u) => u.id === newUserId)) {
      throw new Error("Target user is not assignable for this item");
    }
  }

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
