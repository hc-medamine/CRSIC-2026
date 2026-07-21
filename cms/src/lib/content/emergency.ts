import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { insertComment } from "@/lib/content/comments";
import { canReview } from "@/lib/content/permissions";
import {
  assertNotAwayFrozen,
  refreshUserFromDb,
} from "@/lib/content/ooo";
import { contentPathSegment, type ContentType } from "@/lib/content/lifecycle";
import { getNewsById } from "@/lib/content/news";
import { getEventById } from "@/lib/content/events";
import { getPublicationById } from "@/lib/content/publications";
import { buildNewsPayload, rebuildPublicNewsJson } from "@/lib/publish/newsJson";
import { buildEventPayload, rebuildPublicEventsJson } from "@/lib/publish/eventsJson";
import {
  buildPublicationPayload,
  rebuildPublicPublicationsJson,
} from "@/lib/publish/publicationsJson";
import { normalizeAttachments } from "@/lib/publish/media";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";

const ELIGIBLE = ["draft", "changes_requested", "submitted", "approved"] as const;

type ItemRow = {
  id: string;
  content_type: ContentType;
  status: string;
  created_by: string;
  title_ar: string;
  needs_post_review: boolean;
  emergency_published_by: string | null;
  emergency_published_at: Date | null;
  emergency_reason: string | null;
  public_slug: string | null;
};

async function getItem(id: string): Promise<ItemRow | null> {
  const result = await query<ItemRow>(
    `SELECT id, content_type, status, created_by, title_ar,
            needs_post_review, emergency_published_by, emergency_published_at,
            emergency_reason, public_slug
     FROM content_items WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function addRevision(
  itemId: string,
  status: string,
  snapshot: unknown,
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

async function notifyUserIds(
  userIds: string[],
  input: { type: string; title: string; body: string; linkPath: string },
) {
  for (const userId of [...new Set(userIds)]) {
    await createNotification({ userId, ...input });
  }
}

async function listReviewersAndSa(): Promise<string[]> {
  const result = await query<{ id: string }>(
    `SELECT id FROM users WHERE is_active = TRUE AND role IN ('reviewer', 'super_admin')`,
  );
  return result.rows.map((r) => r.id);
}

async function clearEmergencyFlags(itemId: string, actorId: string) {
  await query(
    `UPDATE content_items SET
       needs_post_review = FALSE,
       emergency_published_at = NULL,
       emergency_published_by = NULL,
       emergency_reason = NULL,
       updated_by = $2,
       updated_at = NOW()
     WHERE id = $1`,
    [itemId, actorId],
  );
}

async function assertPostReviewActor(user: SessionUser): Promise<SessionUser> {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer or Super Admin role required");
  return effective;
}

/**
 * Super Admin only: publish live from draft/changes_requested/submitted/approved
 * and flag for mandatory post-publication review.
 */
export async function emergencyPublish(
  user: SessionUser,
  contentItemId: string,
  reason: string,
): Promise<void> {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  if (effective.role !== "super_admin") {
    throw new Error("Only Super Admin may emergency publish");
  }
  const body = reason.trim();
  if (!body) throw new Error("Emergency reason is required");

  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");
  if (item.needs_post_review) {
    throw new Error("Item already awaits post-publication review");
  }
  if (!(ELIGIBLE as readonly string[]).includes(item.status)) {
    throw new Error(
      "Emergency publish allowed from draft, changes_requested, submitted, or approved only",
    );
  }

  const linkPath = `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`;
  const auditAction = `${item.content_type}.emergency_publish`;

  if (item.content_type === "news") {
    const existing = await getNewsById(item.id);
    if (!existing) throw new Error("Not found");
    const slug = await resolvePublicSlug({
      itemId: existing.id,
      titleAr: existing.title_ar,
      existingSlug: existing.public_slug,
    });
    const payload = buildNewsPayload({ ...existing, public_slug: slug });
    const published = await mutateThenRebuildPublic({
      itemId: item.id,
      mutate: async () => {
        const result = await query(
          `UPDATE content_items SET
             status = 'published',
             public_slug = $2,
             published_at = COALESCE(published_at, NOW()),
             live_payload = $4::jsonb,
             live_at = NOW(),
             needs_post_review = TRUE,
             emergency_published_at = NOW(),
             emergency_published_by = $3,
             emergency_reason = $5,
             updated_by = $3,
             updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [item.id, slug, effective.id, JSON.stringify(payload), body],
        );
        return result.rows[0];
      },
      rebuild: rebuildPublicNewsJson,
    });
    await addRevision(
      item.id,
      "published",
      {
        status: "published",
        title_ar: existing.title_ar,
        public_slug: slug,
        emergency: true,
      },
      effective.id,
      `Emergency publish: ${body}`,
    );
    void published;
  } else if (item.content_type === "event") {
    const existing = await getEventById(item.id);
    if (!existing) throw new Error("Not found");
    const slug = await resolvePublicSlug({
      itemId: existing.id,
      titleAr: existing.title_ar,
      existingSlug: existing.public_slug,
    });
    const payload = buildEventPayload({ ...existing, public_slug: slug });
    await mutateThenRebuildPublic({
      itemId: item.id,
      mutate: async () => {
        const result = await query(
          `UPDATE content_items SET
             status = 'published', public_slug = $2,
             published_at = COALESCE(published_at, NOW()),
             live_payload = $4::jsonb, live_at = NOW(),
             needs_post_review = TRUE,
             emergency_published_at = NOW(),
             emergency_published_by = $3,
             emergency_reason = $5,
             updated_by = $3, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [item.id, slug, effective.id, JSON.stringify(payload), body],
        );
        return result.rows[0];
      },
      rebuild: rebuildPublicEventsJson,
    });
    await addRevision(
      item.id,
      "published",
      { status: "published", title_ar: existing.title_ar, public_slug: slug, emergency: true },
      effective.id,
      `Emergency publish: ${body}`,
    );
  } else {
    const existing = await getPublicationById(item.id);
    if (!existing) throw new Error("Not found");
    if (!existing.image_path?.trim() && normalizeAttachments(existing.attachments).length === 0) {
      throw new Error("Cover path is required before publish");
    }
    const slug = await resolvePublicSlug({
      itemId: existing.id,
      titleAr: existing.title_ar,
      existingSlug: existing.public_slug,
    });
    const payload = buildPublicationPayload({ ...existing, public_slug: slug });
    await mutateThenRebuildPublic({
      itemId: item.id,
      mutate: async () => {
        const result = await query(
          `UPDATE content_items SET
             status = 'published', public_slug = $2,
             published_at = COALESCE(published_at, NOW()),
             live_payload = $4::jsonb, live_at = NOW(),
             needs_post_review = TRUE,
             emergency_published_at = NOW(),
             emergency_published_by = $3,
             emergency_reason = $5,
             updated_by = $3, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [item.id, slug, effective.id, JSON.stringify(payload), body],
        );
        return result.rows[0];
      },
      rebuild: rebuildPublicPublicationsJson,
    });
    await addRevision(
      item.id,
      "published",
      { status: "published", title_ar: existing.title_ar, public_slug: slug, emergency: true },
      effective.id,
      `Emergency publish: ${body}`,
    );
  }

  await insertComment({
    contentItemId: item.id,
    authorId: effective.id,
    body: `Emergency publish: ${body}`,
    kind: "general",
  });

  await writeAudit({
    actor: effective,
    action: auditAction,
    entityType: item.content_type,
    entityId: item.id,
    summary: `Emergency publish — ${item.title_ar}`,
    metadata: { reason: body, status: "published" },
  });

  const targets = await listReviewersAndSa();
  await notifyUserIds(targets, {
    type: `${item.content_type}.emergency_publish`,
    title: "Emergency publish — post-review required",
    body: `${item.title_ar}: ${body}`,
    linkPath,
  });
}

export async function confirmPostReview(
  user: SessionUser,
  contentItemId: string,
): Promise<void> {
  const effective = await assertPostReviewActor(user);
  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");
  if (!item.needs_post_review || item.status !== "published") {
    throw new Error("Item is not awaiting post-publication review");
  }
  if (item.emergency_published_by === effective.id) {
    throw new Error("You cannot Confirm OK on an item you emergency-published");
  }

  await clearEmergencyFlags(item.id, effective.id);

  await writeAudit({
    actor: effective,
    action: `${item.content_type}.post_review_ok`,
    entityType: item.content_type,
    entityId: item.id,
    summary: `Post-review confirmed — ${item.title_ar}`,
  });

  const linkPath = `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`;
  const notify = [item.created_by, item.emergency_published_by].filter(Boolean) as string[];
  await notifyUserIds(notify, {
    type: `${item.content_type}.post_review_ok`,
    title: "Post-publication review confirmed",
    body: item.title_ar,
    linkPath,
  });
}

export async function requestPostReviewChanges(
  user: SessionUser,
  contentItemId: string,
  note: string,
): Promise<void> {
  const effective = await assertPostReviewActor(user);
  const body = note.trim();
  if (!body) throw new Error("Change note is required");

  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");
  if (!item.needs_post_review || item.status !== "published") {
    throw new Error("Item is not awaiting post-publication review");
  }

  await insertComment({
    contentItemId: item.id,
    authorId: effective.id,
    body: `Post-review changes requested: ${body}`,
    kind: "changes_requested",
  });

  await writeAudit({
    actor: effective,
    action: `${item.content_type}.post_review_changes`,
    entityType: item.content_type,
    entityId: item.id,
    summary: `Post-review changes — ${item.title_ar}`,
    metadata: { note: body },
  });

  const linkPath = `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`;
  await notifyUserIds([item.created_by], {
    type: `${item.content_type}.post_review_changes`,
    title: "Post-review: changes requested",
    body: `${item.title_ar}: ${body}`,
    linkPath,
  });
  if (item.emergency_published_by) {
    await notifyUserIds([item.emergency_published_by], {
      type: `${item.content_type}.post_review_changes`,
      title: "Post-review: changes requested",
      body: `${item.title_ar}: ${body}`,
      linkPath,
    });
  }
}

/** Unpublish (rollback) while clearing emergency flag. Bypasser may do this. */
export async function unpublishPostReview(
  user: SessionUser,
  contentItemId: string,
): Promise<void> {
  const effective = await assertPostReviewActor(user);
  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");
  if (!item.needs_post_review || item.status !== "published") {
    throw new Error("Item is not awaiting post-publication review");
  }

  const rebuild =
    item.content_type === "news"
      ? rebuildPublicNewsJson
      : item.content_type === "event"
        ? rebuildPublicEventsJson
        : rebuildPublicPublicationsJson;

  await mutateThenRebuildPublic({
    itemId: item.id,
    mutate: async () => {
      const result = await query(
        `UPDATE content_items SET
           status = 'unpublished',
           live_payload = NULL,
           live_at = NULL,
           needs_post_review = FALSE,
           emergency_published_at = NULL,
           emergency_published_by = NULL,
           emergency_reason = NULL,
           updated_by = $2,
           updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [item.id, effective.id],
      );
      return result.rows[0];
    },
    rebuild,
  });

  await addRevision(
    item.id,
    "unpublished",
    { status: "unpublished", emergency_rollback: true },
    effective.id,
    "Unpublished after emergency (post-review)",
  );

  await writeAudit({
    actor: effective,
    action: `${item.content_type}.post_review_unpublish`,
    entityType: item.content_type,
    entityId: item.id,
    summary: `Post-review unpublish — ${item.title_ar}`,
  });

  const linkPath = `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`;
  const notify = [item.created_by, item.emergency_published_by].filter(Boolean) as string[];
  await notifyUserIds(notify, {
    type: `${item.content_type}.post_review_unpublish`,
    title: "Emergency item unpublished",
    body: item.title_ar,
    linkPath,
  });
}

export async function listNeedsPostReview(): Promise<
  {
    id: string;
    contentType: ContentType;
    title: string;
    reason: string | null;
    publishedByName: string | null;
    publishedAt: string | null;
    href: string;
  }[]
> {
  const result = await query<{
    id: string;
    content_type: ContentType;
    title_ar: string;
    emergency_reason: string | null;
    publisher_name: string | null;
    emergency_published_at: Date | null;
  }>(
    `SELECT c.id, c.content_type, c.title_ar, c.emergency_reason,
            u.display_name AS publisher_name, c.emergency_published_at
     FROM content_items c
     LEFT JOIN users u ON u.id = c.emergency_published_by
     WHERE c.needs_post_review = TRUE AND c.status = 'published'
     ORDER BY c.emergency_published_at DESC NULLS LAST
     LIMIT 50`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    contentType: r.content_type,
    title: r.title_ar,
    reason: r.emergency_reason,
    publishedByName: r.publisher_name,
    publishedAt: r.emergency_published_at?.toISOString() ?? null,
    href: `/dashboard/${contentPathSegment(r.content_type)}/${r.id}`,
  }));
}

export async function getEmergencyMeta(contentItemId: string): Promise<{
  needsPostReview: boolean;
  emergencyPublishedAt: string | null;
  emergencyPublishedBy: string | null;
  emergencyPublishedByName: string | null;
  emergencyReason: string | null;
}> {
  const result = await query<{
    needs_post_review: boolean;
    emergency_published_at: Date | null;
    emergency_published_by: string | null;
    publisher_name: string | null;
    emergency_reason: string | null;
  }>(
    `SELECT c.needs_post_review, c.emergency_published_at, c.emergency_published_by,
            u.display_name AS publisher_name, c.emergency_reason
     FROM content_items c
     LEFT JOIN users u ON u.id = c.emergency_published_by
     WHERE c.id = $1`,
    [contentItemId],
  );
  const row = result.rows[0];
  return {
    needsPostReview: row?.needs_post_review ?? false,
    emergencyPublishedAt: row?.emergency_published_at?.toISOString() ?? null,
    emergencyPublishedBy: row?.emergency_published_by ?? null,
    emergencyPublishedByName: row?.publisher_name ?? null,
    emergencyReason: row?.emergency_reason ?? null,
  };
}
