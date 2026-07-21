import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { canReview } from "@/lib/content/permissions";
import { insertComment } from "@/lib/content/comments";
import {
  assertNotAwayFrozen,
  expandOooNotifyTargets,
  refreshUserFromDb,
} from "@/lib/content/ooo";
import { contentPathSegment, type ContentType } from "@/lib/content/lifecycle";

type ItemRow = {
  id: string;
  content_type: ContentType;
  status: string;
  created_by: string;
  title_ar: string;
  review_owner_id: string | null;
  review_owner_proposed_id: string | null;
};

async function getItem(id: string): Promise<ItemRow | null> {
  const result = await query<ItemRow>(
    `SELECT id, content_type, status, created_by, title_ar,
            review_owner_id, review_owner_proposed_id
     FROM content_items WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function assertEligibleReviewOwner(userId: string): Promise<{
  id: string;
  display_name: string;
  role: string;
}> {
  const fresh = await refreshUserFromDb(userId);
  if (!fresh) throw new Error("Target user not found or inactive");
  if (fresh.role !== "reviewer" && fresh.role !== "super_admin") {
    throw new Error("Review owner must be a Reviewer or Super Admin");
  }
  return { id: fresh.id, display_name: fresh.displayName, role: fresh.role };
}

async function notifyUserIds(
  userIds: string[],
  input: { type: string; title: string; body: string; linkPath: string },
) {
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    await createNotification({ userId, ...input });
  }
}

/** Decision 7B + OOO: notify review owner if set, else all reviewers+SA; expand OOO fan-out. */
export async function notifyOnSubmit(
  contentItemId: string,
  title: string,
  body: string,
  linkPath: string,
  type: string,
) {
  const item = await getItem(contentItemId);
  if (!item) return;

  let primary: string[] = [];
  if (item.review_owner_id) {
    primary = [item.review_owner_id];
  } else {
    const reviewers = await query<{ id: string }>(
      `SELECT id FROM users WHERE is_active = TRUE AND role IN ('reviewer', 'super_admin')`,
    );
    primary = reviewers.rows.map((r) => r.id);
  }

  const targets = await expandOooNotifyTargets(primary);
  await notifyUserIds(targets, { type, title, body, linkPath });
}

/**
 * Reviewer proposes a review owner (V2 — pending SA confirm).
 * Super Admin calling this applies immediately via setReviewOwnerConfirmed.
 */
export async function proposeReviewOwner(
  user: SessionUser,
  contentItemId: string,
  newOwnerId: string,
): Promise<void> {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  await assertNotAwayFrozen(effective);
  if (!canReview(effective)) throw new Error("Reviewer or Super Admin role required");

  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");
  if (!["submitted", "changes_requested", "draft"].includes(item.status)) {
    throw new Error("Can only set review owner on draft, submitted, or changes_requested items");
  }

  const target = await assertEligibleReviewOwner(newOwnerId);
  if (target.id === item.created_by) {
    throw new Error("Four-eyes: review owner cannot be the item author");
  }

  if (effective.role === "super_admin") {
    await applyReviewOwner(effective, item, target.id, target.display_name);
    return;
  }

  await query(
    `UPDATE content_items SET
       review_owner_proposed_id = $2,
       review_owner_proposed_by = $3,
       review_owner_proposed_at = NOW(),
       updated_by = $3,
       updated_at = NOW()
     WHERE id = $1`,
    [contentItemId, target.id, effective.id],
  );

  await writeAudit({
    actor: effective,
    action: "content.review_owner_proposed",
    entityType: item.content_type,
    entityId: item.id,
    summary: `Proposed review owner ${target.display_name} for "${item.title_ar}"`,
    metadata: { proposedId: target.id },
  });

  const sas = await query<{ id: string }>(
    `SELECT id FROM users WHERE is_active = TRUE AND role = 'super_admin'`,
  );
  await notifyUserIds(
    sas.rows.map((r) => r.id),
    {
      type: `${item.content_type}.review_owner_proposed`,
      title: "Review owner proposal needs confirmation",
      body: `${item.title_ar} → ${target.display_name}`,
      linkPath: `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`,
    },
  );
}

export async function confirmReviewOwner(
  user: SessionUser,
  contentItemId: string,
  accept: boolean,
): Promise<void> {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  if (effective.role !== "super_admin") {
    throw new Error("Only Super Admin can confirm review owner proposals");
  }

  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");
  if (!item.review_owner_proposed_id) {
    throw new Error("No pending review owner proposal");
  }

  if (!accept) {
    await query(
      `UPDATE content_items SET
         review_owner_proposed_id = NULL,
         review_owner_proposed_by = NULL,
         review_owner_proposed_at = NULL,
         updated_by = $2,
         updated_at = NOW()
       WHERE id = $1`,
      [contentItemId, effective.id],
    );
    await writeAudit({
      actor: effective,
      action: "content.review_owner_rejected",
      entityType: item.content_type,
      entityId: item.id,
      summary: `Rejected review owner proposal for "${item.title_ar}"`,
    });
    return;
  }

  const target = await assertEligibleReviewOwner(item.review_owner_proposed_id);
  await applyReviewOwner(effective, item, target.id, target.display_name);
}

async function applyReviewOwner(
  actor: SessionUser,
  item: ItemRow,
  ownerId: string,
  ownerName: string,
): Promise<void> {
  await query(
    `UPDATE content_items SET
       review_owner_id = $2,
       review_owner_proposed_id = NULL,
       review_owner_proposed_by = NULL,
       review_owner_proposed_at = NULL,
       updated_by = $3,
       updated_at = NOW()
     WHERE id = $1`,
    [item.id, ownerId, actor.id],
  );

  await writeAudit({
    actor,
    action: "content.review_owner_set",
    entityType: item.content_type,
    entityId: item.id,
    summary: `Review owner set to ${ownerName} for "${item.title_ar}"`,
    metadata: { ownerId },
  });

  const linkPath = `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`;
  const targets = await expandOooNotifyTargets([ownerId]);
  await notifyUserIds(targets, {
    type: `${item.content_type}.review_owner_set`,
    title: "You are the review owner",
    body: item.title_ar,
    linkPath,
  });
}

export async function escalateItem(
  user: SessionUser,
  contentItemId: string,
  note: string,
): Promise<void> {
  const effective = (await refreshUserFromDb(user.id)) ?? user;
  const body = note.trim();
  if (!body) throw new Error("Escalation note is required");

  const item = await getItem(contentItemId);
  if (!item) throw new Error("Not found");

  const isAuthor = item.created_by === effective.id;
  const reviewer = canReview(effective);
  if (!isAuthor && !reviewer) {
    throw new Error("Only the author, Reviewer, or Super Admin can escalate");
  }

  await query(
    `UPDATE content_items SET escalated_at = NOW(), updated_by = $2, updated_at = NOW()
     WHERE id = $1`,
    [contentItemId, effective.id],
  );

  await insertComment({
    contentItemId,
    authorId: effective.id,
    body: `Escalation: ${body}`,
    kind: "general",
  });

  await writeAudit({
    actor: effective,
    action: "content.escalated",
    entityType: item.content_type,
    entityId: item.id,
    summary: `Escalated "${item.title_ar}": ${body}`,
  });

  const sas = await query<{ id: string }>(
    `SELECT id FROM users WHERE is_active = TRUE AND role = 'super_admin'`,
  );
  const linkPath = `/dashboard/${contentPathSegment(item.content_type)}/${item.id}`;
  await notifyUserIds(
    sas.rows.map((r) => r.id),
    {
      type: `${item.content_type}.escalated`,
      title: "Content escalated",
      body: `${item.title_ar}: ${body}`,
      linkPath,
    },
  );
}

export async function listPendingReviewOwnerProposals(): Promise<
  {
    id: string;
    contentType: ContentType;
    title: string;
    proposedOwnerName: string | null;
    proposedByName: string | null;
    proposedAt: string | null;
    href: string;
  }[]
> {
  const result = await query<{
    id: string;
    content_type: ContentType;
    title_ar: string;
    proposed_owner_name: string | null;
    proposed_by_name: string | null;
    review_owner_proposed_at: Date | null;
  }>(
    `SELECT c.id, c.content_type, c.title_ar,
            po.display_name AS proposed_owner_name,
            pb.display_name AS proposed_by_name,
            c.review_owner_proposed_at
     FROM content_items c
     LEFT JOIN users po ON po.id = c.review_owner_proposed_id
     LEFT JOIN users pb ON pb.id = c.review_owner_proposed_by
     WHERE c.review_owner_proposed_id IS NOT NULL
     ORDER BY c.review_owner_proposed_at DESC NULLS LAST
     LIMIT 50`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    contentType: r.content_type,
    title: r.title_ar,
    proposedOwnerName: r.proposed_owner_name,
    proposedByName: r.proposed_by_name,
    proposedAt: r.review_owner_proposed_at?.toISOString() ?? null,
    href: `/dashboard/${contentPathSegment(r.content_type)}/${r.id}`,
  }));
}

export async function listEligibleReviewOwners(): Promise<
  { id: string; display_name: string; email: string; role: string }[]
> {
  const result = await query<{
    id: string;
    display_name: string;
    email: string;
    role: string;
  }>(
    `SELECT id, display_name, email, role FROM users
     WHERE is_active = TRUE AND role IN ('reviewer', 'super_admin')
     ORDER BY display_name ASC`,
  );
  return result.rows;
}

export async function getReviewOwnerMeta(contentItemId: string): Promise<{
  reviewOwnerId: string | null;
  reviewOwnerName: string | null;
  proposedOwnerId: string | null;
  proposedOwnerName: string | null;
  proposedByName: string | null;
  escalatedAt: string | null;
}> {
  const result = await query<{
    review_owner_id: string | null;
    owner_name: string | null;
    review_owner_proposed_id: string | null;
    proposed_name: string | null;
    proposed_by_name: string | null;
    escalated_at: Date | null;
  }>(
    `SELECT c.review_owner_id, o.display_name AS owner_name,
            c.review_owner_proposed_id, p.display_name AS proposed_name,
            pb.display_name AS proposed_by_name, c.escalated_at
     FROM content_items c
     LEFT JOIN users o ON o.id = c.review_owner_id
     LEFT JOIN users p ON p.id = c.review_owner_proposed_id
     LEFT JOIN users pb ON pb.id = c.review_owner_proposed_by
     WHERE c.id = $1`,
    [contentItemId],
  );
  const row = result.rows[0];
  return {
    reviewOwnerId: row?.review_owner_id ?? null,
    reviewOwnerName: row?.owner_name ?? null,
    proposedOwnerId: row?.review_owner_proposed_id ?? null,
    proposedOwnerName: row?.proposed_name ?? null,
    proposedByName: row?.proposed_by_name ?? null,
    escalatedAt: row?.escalated_at?.toISOString() ?? null,
  };
}
