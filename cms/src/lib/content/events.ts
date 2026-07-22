import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { appendWorkflowComment } from "@/lib/content/comments";
import { buildEventPayload, rebuildPublicEventsJson } from "@/lib/publish/eventsJson";
import { normalizeAttachments, type PublicMediaItem } from "@/lib/publish/media";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";
import {
  canAccessContentType,
  canAccessOrg,
  canReview,
} from "@/lib/content/permissions";
import { notifyOnSubmit } from "@/lib/content/delegation";
import { assertNotAwayFrozen, refreshUserFromDb } from "@/lib/content/ooo";
import type { ContentStatus } from "@/lib/content/news";

async function auditEvent(
  user: SessionUser,
  action: string,
  item: { id: string; title_ar: string; status: string },
  summary?: string,
) {
  await writeAudit({
    actor: user,
    action,
    entityType: "event",
    entityId: item.id,
    summary: summary ?? `${action} — ${item.title_ar}`,
    metadata: { status: item.status, title: item.title_ar },
  });
}

export type EventItem = {
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
  image_alt_ar: string | null;
  image_alt_en: string | null;
  attachments: PublicMediaItem[] | unknown;
  event_scope: "intl" | "nat" | null;
  event_day: string | null;
  event_month: string | null;
  event_year: string | null;
  event_type_ar: string | null;
  event_type_en: string | null;
  event_display_status: "upcoming" | "done" | null;
  checklist_confirmed: boolean;
  review_note: string | null;
  public_slug: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type EventInput = {
  orgUnitId: string;
  titleAr: string;
  titleEn?: string;
  summaryAr?: string;
  summaryEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  imagePath?: string | null;
  imageAltAr?: string;
  imageAltEn?: string;
  attachments?: PublicMediaItem[];
  publicSlug?: string | null;
  enStatus?: "pending" | "ready";
  eventScope: "intl" | "nat";
  eventDay: string;
  eventMonth: string;
  eventYear: string;
  eventTypeAr: string;
  eventTypeEn?: string;
  eventDisplayStatus: "upcoming" | "done";
};

function snapshotOf(row: EventItem) {
  return {
    status: row.status,
    org_unit_id: row.org_unit_id,
    en_status: row.en_status,
    title_ar: row.title_ar,
    title_en: row.title_en,
    summary_ar: row.summary_ar,
    body_ar: row.body_ar,
    event_scope: row.event_scope,
    event_day: row.event_day,
    event_month: row.event_month,
    event_year: row.event_year,
    event_type_ar: row.event_type_ar,
    event_type_en: row.event_type_en,
    event_display_status: row.event_display_status,
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

function validateEventFields(input: EventInput) {
  if (!input.titleAr.trim()) throw new Error("Arabic title is required");
  if (!input.eventDay.trim() || !input.eventMonth.trim() || !input.eventYear.trim()) {
    throw new Error("Event day, month, and year are required");
  }
  if (!input.eventTypeAr.trim()) throw new Error("Event type (AR) is required");
  if (!["intl", "nat"].includes(input.eventScope)) throw new Error("Invalid event scope");
  if (!["upcoming", "done"].includes(input.eventDisplayStatus)) {
    throw new Error("Invalid display status");
  }
}

export async function getEventById(id: string): Promise<EventItem | null> {
  const result = await query<EventItem>(
    `SELECT * FROM content_items WHERE id = $1 AND content_type = 'event'`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listEventsForUser(user: SessionUser): Promise<EventItem[]> {
  if (!(await canAccessContentType(user, "event"))) return [];
  if (user.role === "super_admin" || user.role === "reviewer") {
    const result = await query<EventItem>(
      `SELECT * FROM content_items WHERE content_type = 'event' ORDER BY updated_at DESC`,
    );
    return result.rows;
  }
  const result = await query<EventItem>(
    `SELECT * FROM content_items
     WHERE content_type = 'event' AND created_by = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );
  return result.rows;
}

export async function createEvent(user: SessionUser, input: EventInput): Promise<EventItem> {
  if (!(await canAccessContentType(user, "event"))) throw new Error("No event content permission");
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  validateEventFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const attachments = normalizeAttachments(input.attachments);
  const primaryImage =
    attachments.find((a) => a.kind === "image")?.src ?? input.imagePath ?? null;

  const result = await query<EventItem>(
    `INSERT INTO content_items (
      content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, summary_ar, summary_en, body_ar, body_en,
      image_path, image_alt_ar, image_alt_en, attachments,
      event_scope, event_day, event_month, event_year,
      event_type_ar, event_type_en, event_display_status
    ) VALUES (
      'event', 'draft', $1, $2, $2, $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13::jsonb,
      $14, $15, $16, $17,
      $18, $19, $20
    ) RETURNING *`,
    [
      input.orgUnitId,
      user.id,
      enStatus,
      input.titleAr.trim(),
      input.titleEn?.trim() || null,
      input.summaryAr?.trim() || null,
      input.summaryEn?.trim() || null,
      input.bodyAr?.trim() || null,
      input.bodyEn?.trim() || null,
      primaryImage,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
      JSON.stringify(attachments),
      input.eventScope,
      input.eventDay.trim(),
      input.eventMonth.trim(),
      input.eventYear.trim(),
      input.eventTypeAr.trim(),
      input.eventTypeEn?.trim() || null,
      input.eventDisplayStatus,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Created");
  await auditEvent(user, "event.create", item);
  return item;
}

export async function updateEventDraft(user: SessionUser, id: string, input: EventInput) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) {
    throw new Error("Only draft or changes_requested items can be edited");
  }
  if (existing.created_by !== user.id && user.role !== "super_admin") {
    throw new Error("Only the author (or Super Admin) can edit this draft");
  }
  if (!(await canAccessOrg(user, input.orgUnitId))) throw new Error("No permission for this organisation unit");
  validateEventFields(input);
  const enStatus = input.enStatus ?? (input.titleEn?.trim() ? "ready" : "pending");
  const attachments = normalizeAttachments(input.attachments);
  const primaryImage =
    attachments.find((a) => a.kind === "image")?.src ?? input.imagePath ?? null;
  const slugOverride =
    user.role === "super_admin" && input.publicSlug !== undefined
      ? input.publicSlug
      : undefined;

  const result = await query<EventItem>(
    `UPDATE content_items SET
      org_unit_id = $2, updated_by = $3, en_status = $4,
      title_ar = $5, title_en = $6, summary_ar = $7, summary_en = $8,
      body_ar = $9, body_en = $10, image_path = $11, image_alt_ar = $12, image_alt_en = $13,
      attachments = $14::jsonb,
      event_scope = $15, event_day = $16, event_month = $17, event_year = $18,
      event_type_ar = $19, event_type_en = $20, event_display_status = $21,
      public_slug = COALESCE($22, public_slug),
      updated_at = NOW()
     WHERE id = $1 AND content_type = 'event'
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
      input.bodyAr?.trim() || null,
      input.bodyEn?.trim() || null,
      primaryImage,
      input.imageAltAr?.trim() || null,
      input.imageAltEn?.trim() || null,
      JSON.stringify(attachments),
      input.eventScope,
      input.eventDay.trim(),
      input.eventMonth.trim(),
      input.eventYear.trim(),
      input.eventTypeAr.trim(),
      input.eventTypeEn?.trim() || null,
      input.eventDisplayStatus,
      slugOverride?.trim() || null,
    ],
  );
  const item = result.rows[0];
  await addRevision(item.id, item.status, snapshotOf(item), user.id, "Edited");
  return item;
}

async function notifyReviewers(itemId: string, title: string, body: string, linkPath: string) {
  await notifyOnSubmit(itemId, title, body, linkPath, "event.submitted");
}

export async function submitEvent(user: SessionUser, id: string, checklistConfirmed: boolean) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  if (!["draft", "changes_requested"].includes(existing.status)) throw new Error("Cannot submit in current status");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can submit");
  if (!checklistConfirmed) throw new Error("Editorial checklist must be confirmed");
  if (!existing.title_ar.trim()) throw new Error("Arabic title is required");
  if (existing.image_path && !existing.image_alt_ar?.trim()) {
    throw new Error("Image alt text (AR) is required when an image is set");
  }

  const result = await query<EventItem>(
    `UPDATE content_items SET status = 'submitted', checklist_confirmed = TRUE,
      updated_by = $2, review_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "submitted", snapshotOf(item), user.id, "Submitted for review");
  await notifyReviewers(
    item.id,
    "Event submitted for review",
    item.title_ar,
    `/dashboard/events/${item.id}`,
  );
  await auditEvent(user, "event.submit", item);
  return item;
}

export async function withdrawEvent(user: SessionUser, id: string) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  if (existing.status !== "submitted") throw new Error("Only submitted items can be withdrawn");
  if (existing.created_by !== user.id && user.role !== "super_admin") throw new Error("Only the author can withdraw");
  const result = await query<EventItem>(
    `UPDATE content_items SET status = 'draft', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "draft", snapshotOf(item), user.id, "Withdrawn to draft");
  await auditEvent(user, "event.withdraw", item);
  return item;
}

async function assertReviewer(user: SessionUser, item: EventItem) {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer role required");
  if (item.created_by === effective.id) throw new Error("Four-eyes: you cannot review your own item");
}

export async function requestEventChanges(user: SessionUser, id: string, note: string) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Change request note is required");
  const result = await query<EventItem>(
    `UPDATE content_items SET status = 'changes_requested', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "changes_requested", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "changes_requested");
  await createNotification({
    userId: item.created_by,
    type: "event.changes_requested",
    title: "Changes requested on event",
    body: note.trim(),
    linkPath: `/dashboard/events/${item.id}`,
  });
  await auditEvent(user, "event.changes_requested", item, note.trim());
  return item;
}

export async function approveEvent(user: SessionUser, id: string) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  const result = await query<EventItem>(
    `UPDATE content_items SET status = 'approved', review_note = NULL, updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "approved", snapshotOf(item), user.id, "Approved");
  await createNotification({
    userId: item.created_by,
    type: "event.approved",
    title: "Event approved",
    body: item.title_ar,
    linkPath: `/dashboard/events/${item.id}`,
  });
  await auditEvent(user, "event.approve", item);
  return item;
}

export async function rejectEvent(user: SessionUser, id: string, note: string) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "submitted") throw new Error("Item is not awaiting review");
  if (!note.trim()) throw new Error("Rejection note is required");
  const result = await query<EventItem>(
    `UPDATE content_items SET status = 'rejected', review_note = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, note.trim(), user.id],
  );
  const item = result.rows[0];
  await addRevision(item.id, "rejected", snapshotOf(item), user.id, note.trim());
  await appendWorkflowComment(user, item.id, note.trim(), "rejected");
  await createNotification({
    userId: item.created_by,
    type: "event.rejected",
    title: "Event rejected",
    body: note.trim(),
    linkPath: `/dashboard/events/${item.id}`,
  });
  await auditEvent(user, "event.reject", item, note.trim());
  return item;
}

export async function publishEvent(user: SessionUser, id: string) {
  const existing = await getEventById(id);
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
  const payload = buildEventPayload({ ...existing, public_slug: slug });
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<EventItem>(
        `UPDATE content_items SET status = 'published', public_slug = $2,
          published_at = COALESCE(published_at, NOW()),
          live_payload = $4::jsonb, live_at = NOW(),
          updated_by = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, slug, user.id, JSON.stringify(payload)],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicEventsJson,
  });
  await addRevision(item.id, "published", snapshotOf(item), user.id, "Published");
  await createNotification({
    userId: item.created_by,
    type: "event.published",
    title: "Event published",
    body: item.title_ar,
    linkPath: `/dashboard/events/${item.id}`,
  });
  await auditEvent(user, "event.publish", item, "Published to events.json");
  return item;
}

export async function unpublishEvent(user: SessionUser, id: string) {
  const existing = await getEventById(id);
  if (!existing) throw new Error("Not found");
  await assertReviewer(user, existing);
  if (existing.status !== "published") throw new Error("Item is not published");
  const item = await mutateThenRebuildPublic({
    itemId: id,
    mutate: async () => {
      const result = await query<EventItem>(
        `UPDATE content_items SET status = 'unpublished', live_payload = NULL, live_at = NULL,
          needs_post_review = FALSE, emergency_published_at = NULL,
          emergency_published_by = NULL, emergency_reason = NULL,
          updated_by = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, user.id],
      );
      return result.rows[0];
    },
    rebuild: rebuildPublicEventsJson,
  });
  await addRevision(item.id, "unpublished", snapshotOf(item), user.id, "Unpublished");
  await createNotification({
    userId: item.created_by,
    type: "event.unpublished",
    title: "Event unpublished",
    body: item.title_ar,
    linkPath: `/dashboard/events/${item.id}`,
  });
  await auditEvent(user, "event.unpublish", item, "Unpublished from events.json");
  return item;
}
