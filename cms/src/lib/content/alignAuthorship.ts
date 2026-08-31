import { pool, query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { rebuildPublicNewsJson } from "@/lib/publish/newsJson";
import { rebuildPublicEventsJson } from "@/lib/publish/eventsJson";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import {
  ALIGN_PREVIEW_SAMPLE,
  editorFor,
  itemInReviewerScope,
  shouldAssignOrgPublisher,
  type EditorClaim,
  type PublisherSnapshot,
} from "@/lib/content/alignAuthorshipLogic";

export { ALIGN_PREVIEW_SAMPLE, editorFor } from "@/lib/content/alignAuthorshipLogic";

export type AlignOpts = {
  /** Desk Apply notifies; CLI stays silent. */
  notify: boolean;
  /** Desk Apply rebuilds news/events JSON; CLI does not. */
  rebuild: boolean;
};

export type AlignMove = {
  id: string;
  content_type: string;
  title: string;
  status: string;
  fromEmail: string;
  toEmail: string;
  toEditorId: string;
  fromEditorId: string;
  reviewOwnerId: string | null;
  publisherAction: "set" | "keep" | "none";
  publisherToId: string | null;
  editorMoves: boolean;
  reviewOwnerMoves: boolean;
  livePayload: boolean;
};

export type AlignSkip = { type: string; id: string; reason: string };

export type AlignClaimMap = {
  editors: {
    content_type: string;
    org_unit_id: string | null;
    org_name_ar: string | null;
    org_name_en: string | null;
    editor_email: string;
    editor_display_name: string;
  }[];
  reviewers: {
    org_unit_id: string;
    org_name_ar: string | null;
    org_name_en: string | null;
    reviewer_email: string;
    reviewer_display_name: string;
  }[];
};

export type AlignRebuildStatus = {
  lastSuccessAt: string | null;
  lastSuccessActorEmail: string | null;
  lastSuccessNewsCount: number | null;
  lastSuccessEventCount: number | null;
  lastSuccessSkipped: boolean;
  lastAttemptAt: string | null;
  lastAttemptOk: boolean | null;
  lastAttemptError: string | null;
};

export type AlignPreview = {
  scanned: number;
  alreadyAligned: number;
  skipped: AlignSkip[];
  moves: AlignMove[];
  sampleMoves: AlignMove[];
  moreMoves: number;
  byType: Record<string, number>;
  covers: { count: number; toEmail: string | null; inScope: boolean };
  publisherSet: number;
  publisherKept: number;
  publishedNewsTouched: number;
  publishedEventsTouched: number;
  claimMap: AlignClaimMap;
  rebuild: AlignRebuildStatus;
};

type ItemRow = {
  id: string;
  content_type: string;
  org_unit_id: string | null;
  title_ar: string;
  created_by: string;
  author_email: string;
  status: string;
  review_owner_id: string | null;
  publisher_id: string | null;
  live_payload: unknown;
};

type UserPubRow = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
};

function assertCanAlign(user: SessionUser) {
  if (user.role !== "super_admin" && user.role !== "reviewer") {
    throw new Error("Super Admin or Reviewer role required");
  }
}

async function loadEditorClaims(): Promise<EditorClaim[]> {
  const result = await query<EditorClaim>(
    `SELECT ect.content_type, ect.org_unit_id, ect.editor_id, u.email, u.display_name
     FROM editor_content_type_claims ect
     JOIN users u ON u.id = ect.editor_id
     WHERE u.is_active = TRUE`,
  );
  return result.rows;
}

async function loadReviewerByOrg(): Promise<Map<string, string>> {
  const result = await query<{ org_unit_id: string; reviewer_id: string }>(
    `SELECT org_unit_id, reviewer_id FROM reviewer_org_claims`,
  );
  return new Map(result.rows.map((r) => [r.org_unit_id, r.reviewer_id]));
}

async function loadReviewerClaimedOrgs(reviewerId: string): Promise<Set<string>> {
  const result = await query<{ org_unit_id: string }>(
    `SELECT org_unit_id FROM reviewer_org_claims WHERE reviewer_id = $1`,
    [reviewerId],
  );
  return new Set(result.rows.map((r) => r.org_unit_id));
}

async function loadPublisherSnapshots(
  ids: string[],
): Promise<Map<string, PublisherSnapshot>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, PublisherSnapshot>();
  if (unique.length === 0) return map;
  const users = await query<UserPubRow>(
    `SELECT id, email, display_name, role, is_active FROM users WHERE id = ANY($1::uuid[])`,
    [unique],
  );
  const claims = await query<{ reviewer_id: string; org_unit_id: string }>(
    `SELECT reviewer_id, org_unit_id FROM reviewer_org_claims WHERE reviewer_id = ANY($1::uuid[])`,
    [unique],
  );
  const orgs = new Map<string, string[]>();
  for (const row of claims.rows) {
    const list = orgs.get(row.reviewer_id) ?? [];
    list.push(row.org_unit_id);
    orgs.set(row.reviewer_id, list);
  }
  for (const u of users.rows) {
    map.set(u.id, {
      id: u.id,
      role: u.role,
      is_active: u.is_active,
      claimedOrgIds: orgs.get(u.id) ?? [],
    });
  }
  return map;
}

export async function loadAlignClaimMap(): Promise<AlignClaimMap> {
  const editors = await query<{
    content_type: string;
    org_unit_id: string | null;
    org_name_ar: string | null;
    org_name_en: string | null;
    editor_email: string;
    editor_display_name: string;
  }>(
    `SELECT ect.content_type, ect.org_unit_id, o.name_ar AS org_name_ar, o.name_en AS org_name_en,
            u.email AS editor_email, u.display_name AS editor_display_name
     FROM editor_content_type_claims ect
     JOIN users u ON u.id = ect.editor_id
     LEFT JOIN org_units o ON o.id = ect.org_unit_id
     WHERE u.is_active = TRUE
     ORDER BY ect.content_type, ect.org_unit_id NULLS FIRST`,
  );
  const reviewers = await query<{
    org_unit_id: string;
    org_name_ar: string | null;
    org_name_en: string | null;
    reviewer_email: string;
    reviewer_display_name: string;
  }>(
    `SELECT c.org_unit_id, o.name_ar AS org_name_ar, o.name_en AS org_name_en,
            u.email AS reviewer_email, u.display_name AS reviewer_display_name
     FROM reviewer_org_claims c
     JOIN users u ON u.id = c.reviewer_id
     LEFT JOIN org_units o ON o.id = c.org_unit_id
     WHERE u.is_active = TRUE
     ORDER BY o.sort_order NULLS LAST, c.org_unit_id`,
  );
  return { editors: editors.rows, reviewers: reviewers.rows };
}

export async function getAlignRebuildStatus(): Promise<AlignRebuildStatus> {
  const result = await query<{
    last_success_at: Date | null;
    last_success_actor_email: string | null;
    last_success_news_count: number | null;
    last_success_event_count: number | null;
    last_success_skipped: boolean;
    last_attempt_at: Date | null;
    last_attempt_ok: boolean | null;
    last_attempt_error: string | null;
  }>(
    `SELECT last_success_at, last_success_actor_email, last_success_news_count,
            last_success_event_count, last_success_skipped, last_attempt_at,
            last_attempt_ok, last_attempt_error
     FROM site_align_rebuild WHERE id = 1`,
  );
  const row = result.rows[0];
  if (!row) {
    return {
      lastSuccessAt: null,
      lastSuccessActorEmail: null,
      lastSuccessNewsCount: null,
      lastSuccessEventCount: null,
      lastSuccessSkipped: false,
      lastAttemptAt: null,
      lastAttemptOk: null,
      lastAttemptError: null,
    };
  }
  return {
    lastSuccessAt: row.last_success_at?.toISOString() ?? null,
    lastSuccessActorEmail: row.last_success_actor_email,
    lastSuccessNewsCount: row.last_success_news_count,
    lastSuccessEventCount: row.last_success_event_count,
    lastSuccessSkipped: row.last_success_skipped,
    lastAttemptAt: row.last_attempt_at?.toISOString() ?? null,
    lastAttemptOk: row.last_attempt_ok,
    lastAttemptError: row.last_attempt_error,
  };
}

async function recordAlignRebuild(input: {
  actor: SessionUser;
  ok: boolean;
  error?: string | null;
  newsCount?: number | null;
  eventCount?: number | null;
  skipped?: boolean;
}) {
  if (input.ok) {
    await query(
      `UPDATE site_align_rebuild SET
         last_success_at = NOW(),
         last_success_actor_id = $1,
         last_success_actor_email = $2,
         last_success_news_count = $3,
         last_success_event_count = $4,
         last_success_skipped = $5,
         last_attempt_at = NOW(),
         last_attempt_ok = TRUE,
         last_attempt_error = NULL,
         last_attempt_actor_id = $1
       WHERE id = 1`,
      [
        input.actor.id,
        input.actor.email,
        input.newsCount ?? 0,
        input.eventCount ?? 0,
        Boolean(input.skipped),
      ],
    );
    return;
  }
  await query(
    `UPDATE site_align_rebuild SET
       last_attempt_at = NOW(),
       last_attempt_ok = FALSE,
       last_attempt_error = $2,
       last_attempt_actor_id = $1
     WHERE id = 1`,
    [input.actor.id, input.error ?? "Rebuild failed"],
  );
}

async function collectPlan(user: SessionUser): Promise<{
  items: ItemRow[];
  claims: EditorClaim[];
  reviewerByOrg: Map<string, string>;
  publishers: Map<string, PublisherSnapshot>;
  claimedOrgs: Set<string> | null;
  scopedItems: ItemRow[];
  moves: AlignMove[];
  skipped: AlignSkip[];
  coversInScope: boolean;
  pubClaim: EditorClaim | null;
  coverCount: number;
  coverToEmail: string | null;
}> {
  const claims = await loadEditorClaims();
  const reviewerByOrg = await loadReviewerByOrg();
  const claimedOrgs =
    user.role === "reviewer" ? await loadReviewerClaimedOrgs(user.id) : null;

  const items = await query<ItemRow>(
    `SELECT c.id, c.content_type, c.org_unit_id, c.title_ar, c.created_by, c.status,
            c.review_owner_id, c.publisher_id, c.live_payload, u.email AS author_email
     FROM content_items c
     JOIN users u ON u.id = c.created_by
     WHERE c.recycled_at IS NULL
     ORDER BY c.content_type, c.created_at`,
  );

  const scopedItems = items.rows.filter((item) => {
    if (!claimedOrgs) return true;
    return itemInReviewerScope(item.org_unit_id, claimedOrgs);
  });

  const pubIds = scopedItems.map((i) => i.publisher_id).filter((id): id is string => Boolean(id));
  const publishers = await loadPublisherSnapshots(pubIds);

  const skipped: AlignSkip[] = [];
  const moves: AlignMove[] = [];

  for (const item of scopedItems) {
    const claim = editorFor(claims, item.content_type, item.org_unit_id);
    if (!claim) {
      skipped.push({
        type: item.content_type,
        id: item.id,
        reason: `no editor claim (org=${item.org_unit_id})`,
      });
      continue;
    }
    const orgReviewerId = item.org_unit_id
      ? (reviewerByOrg.get(item.org_unit_id) ?? null)
      : null;
    const editorMoves = item.created_by !== claim.editor_id;
    const reviewOwnerMoves = Boolean(orgReviewerId) && item.review_owner_id !== orgReviewerId;
    const currentPub = item.publisher_id ? (publishers.get(item.publisher_id) ?? null) : null;
    const assignPub = shouldAssignOrgPublisher(currentPub, item.org_unit_id, orgReviewerId);
    if (!editorMoves && !reviewOwnerMoves && !assignPub) continue;

    moves.push({
      id: item.id,
      content_type: item.content_type,
      title: item.title_ar,
      status: item.status,
      fromEmail: item.author_email,
      toEmail: claim.email,
      toEditorId: claim.editor_id,
      fromEditorId: item.created_by,
      reviewOwnerId: reviewOwnerMoves ? orgReviewerId : item.review_owner_id,
      publisherAction: assignPub ? "set" : currentPub ? "keep" : "none",
      publisherToId: assignPub ? orgReviewerId : item.publisher_id,
      editorMoves,
      reviewOwnerMoves,
      livePayload: item.live_payload != null,
    });
  }

  const pubClaim = editorFor(claims, "publication", null);
  const coversInScope = Boolean(
    pubClaim &&
      (!claimedOrgs ||
        scopedItems.some((i) => i.content_type === "publication") ||
        items.rows.some(
          (i) =>
            i.content_type === "publication" &&
            itemInReviewerScope(i.org_unit_id, claimedOrgs),
        )),
  );

  let coverCount = 0;
  if (coversInScope && pubClaim) {
    const covers = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM media_assets
       WHERE bucket = 'covers' AND uploaded_by IS DISTINCT FROM $1`,
      [pubClaim.editor_id],
    );
    coverCount = Number(covers.rows[0]?.n ?? 0);
  }

  return {
    items: items.rows,
    claims,
    reviewerByOrg,
    publishers,
    claimedOrgs,
    scopedItems,
    moves,
    skipped,
    coversInScope,
    pubClaim,
    coverCount,
    coverToEmail: coversInScope && pubClaim ? pubClaim.email : null,
  };
}

function summarizePreview(
  plan: Awaited<ReturnType<typeof collectPlan>>,
  claimMap: AlignClaimMap,
  rebuild: AlignRebuildStatus,
): AlignPreview {
  const byType: Record<string, number> = {};
  let publisherSet = 0;
  let publisherKept = 0;
  let publishedNewsTouched = 0;
  let publishedEventsTouched = 0;
  for (const m of plan.moves) {
    byType[m.content_type] = (byType[m.content_type] ?? 0) + 1;
    if (m.publisherAction === "set") publisherSet += 1;
    if (m.publisherAction === "keep") publisherKept += 1;
    if (m.livePayload && m.content_type === "news") publishedNewsTouched += 1;
    if (m.livePayload && m.content_type === "event") publishedEventsTouched += 1;
  }
  const alreadyAligned = plan.scopedItems.length - plan.moves.length - plan.skipped.length;
  return {
    scanned: plan.scopedItems.length,
    alreadyAligned: Math.max(0, alreadyAligned),
    skipped: plan.skipped,
    moves: plan.moves,
    sampleMoves: plan.moves.slice(0, ALIGN_PREVIEW_SAMPLE),
    moreMoves: Math.max(0, plan.moves.length - ALIGN_PREVIEW_SAMPLE),
    byType,
    covers: {
      count: plan.coverCount,
      toEmail: plan.coverToEmail,
      inScope: plan.coversInScope,
    },
    publisherSet,
    publisherKept,
    publishedNewsTouched,
    publishedEventsTouched,
    claimMap,
    rebuild,
  };
}

export function serializeAlignPreview(preview: AlignPreview): Omit<AlignPreview, "moves"> {
  return {
    scanned: preview.scanned,
    alreadyAligned: preview.alreadyAligned,
    skipped: preview.skipped,
    sampleMoves: preview.sampleMoves,
    moreMoves: preview.moreMoves,
    byType: preview.byType,
    covers: preview.covers,
    publisherSet: preview.publisherSet,
    publisherKept: preview.publisherKept,
    publishedNewsTouched: preview.publishedNewsTouched,
    publishedEventsTouched: preview.publishedEventsTouched,
    claimMap: preview.claimMap,
    rebuild: preview.rebuild,
  };
}

export async function previewAlign(user: SessionUser): Promise<AlignPreview> {
  assertCanAlign(user);
  const [plan, claimMap, rebuild] = await Promise.all([
    collectPlan(user),
    loadAlignClaimMap(),
    getAlignRebuildStatus(),
  ]);
  return summarizePreview(plan, claimMap, rebuild);
}

async function notifyReceivingEditors(
  actor: SessionUser,
  moves: AlignMove[],
): Promise<void> {
  const byEditor = new Map<string, { count: number; types: Set<string> }>();
  for (const m of moves) {
    if (!m.editorMoves) continue;
    if (m.toEditorId === actor.id) continue;
    const cur = byEditor.get(m.toEditorId) ?? { count: 0, types: new Set() };
    cur.count += 1;
    cur.types.add(m.content_type);
    byEditor.set(m.toEditorId, cur);
  }
  for (const [editorId, info] of byEditor) {
    const types = [...info.types].join(", ");
    await createNotification({
      userId: editorId,
      type: "content.desk_aligned",
      title: "Items aligned to your desk",
      body: `${info.count} item(s) (${types}) were aligned to your desk.`,
      linkPath: "/dashboard",
    });
  }
}

async function notifySuperAdminsOfReviewerApply(
  actor: SessionUser,
  moveCount: number,
  coverCount: number,
): Promise<void> {
  if (actor.role !== "reviewer") return;
  const sas = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE`,
  );
  for (const sa of sas.rows) {
    if (sa.id === actor.id) continue;
    await createNotification({
      userId: sa.id,
      type: "content.desk_align_ran",
      title: "Reviewer ran Align authorship",
      body: `${actor.email} applied Align: ${moveCount} item(s), ${coverCount} cover(s).`,
      linkPath: "/dashboard/editors",
    });
  }
}

export async function applyAlign(
  user: SessionUser,
  opts: AlignOpts,
): Promise<AlignPreview & { rebuildError?: string; applied: boolean }> {
  assertCanAlign(user);
  const plan = await collectPlan(user);
  const claimMap = await loadAlignClaimMap();
  const preview = summarizePreview(plan, claimMap, await getAlignRebuildStatus());

  const hasWork = plan.moves.length > 0 || plan.coverCount > 0;
  if (!hasWork) {
    return { ...preview, applied: false };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const move of plan.moves) {
      await client.query(
        `UPDATE content_items
         SET created_by = $2,
             review_owner_id = COALESCE($3, review_owner_id),
             publisher_id = CASE WHEN $4::boolean THEN $5::uuid ELSE publisher_id END,
             updated_by = $6,
             updated_at = NOW()
         WHERE id = $1`,
        [
          move.id,
          move.toEditorId,
          move.reviewOwnerMoves ? move.reviewOwnerId : null,
          move.publisherAction === "set",
          move.publisherToId,
          user.id,
        ],
      );
      await client.query(
        `INSERT INTO audit_log
          (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          user.id,
          user.email,
          "content.reassign",
          move.content_type,
          move.id,
          `Desk align "${move.title}" ${move.fromEmail} → ${move.toEmail}`,
          JSON.stringify({
            reason: "align_to_editor_claims",
            from: move.fromEditorId,
            fromEmail: move.fromEmail,
            to: move.toEditorId,
            toEmail: move.toEmail,
            reviewOwnerId: move.reviewOwnerId,
            publisherAction: move.publisherAction,
            publisherToId: move.publisherToId,
            status: move.status,
          }),
        ],
      );
    }

    if (plan.coversInScope && plan.pubClaim && plan.coverCount > 0) {
      await client.query(
        `UPDATE media_assets
         SET uploaded_by = $1
         WHERE bucket = 'covers' AND uploaded_by IS DISTINCT FROM $1`,
        [plan.pubClaim.editor_id],
      );
    }

    await client.query(
      `INSERT INTO audit_log
        (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
       VALUES ($1, $2, $3, $4, NULL, $5, $6::jsonb)`,
      [
        user.id,
        user.email,
        "content.bulk_reassign_to_claims",
        "content",
        `Desk authorship align: ${plan.moves.length} items; skipped ${plan.skipped.length}; covers ${plan.coverCount}`,
        JSON.stringify({
          reassigned: plan.moves.length,
          skipped: plan.skipped.length,
          covers: plan.coverToEmail
            ? { to: plan.coverToEmail, n: plan.coverCount }
            : null,
          publisherSet: preview.publisherSet,
          publishedNewsTouched: preview.publishedNewsTouched,
          publishedEventsTouched: preview.publishedEventsTouched,
        }),
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }

  if (opts.notify) {
    await notifyReceivingEditors(user, plan.moves);
    await notifySuperAdminsOfReviewerApply(user, plan.moves.length, plan.coverCount);
  }

  let rebuildError: string | undefined;
  if (opts.rebuild) {
    rebuildError = await runAlignRebuild(user, {
      news: preview.publishedNewsTouched > 0,
      events: preview.publishedEventsTouched > 0,
    });
  }

  const next = await previewAlign(user);
  return { ...next, applied: true, rebuildError };
}

async function runAlignRebuild(
  user: SessionUser,
  need: { news: boolean; events: boolean },
): Promise<string | undefined> {
  if (!need.news && !need.events) {
    await recordAlignRebuild({
      actor: user,
      ok: true,
      skipped: true,
      newsCount: 0,
      eventCount: 0,
    });
    return undefined;
  }
  try {
    let newsCount = 0;
    let eventCount = 0;
    if (need.news) {
      const news = await rebuildPublicNewsJson();
      newsCount = news.count;
    }
    if (need.events) {
      const events = await rebuildPublicEventsJson();
      eventCount = events.intl + events.nat;
    }
    await recordAlignRebuild({
      actor: user,
      ok: true,
      skipped: false,
      newsCount,
      eventCount,
    });
    return undefined;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rebuild failed";
    await recordAlignRebuild({ actor: user, ok: false, error: message });
    return message;
  }
}

export async function retryAlignRebuild(user: SessionUser): Promise<{
  rebuild: AlignRebuildStatus;
  error?: string;
}> {
  assertCanAlign(user);
  const error = await runAlignRebuild(user, { news: true, events: true });
  return { rebuild: await getAlignRebuildStatus(), error };
}

export type EligiblePublisher = {
  id: string;
  display_name: string;
  name_ar: string | null;
  name_en: string | null;
  email: string;
  role: string;
};

export async function listEligiblePublishers(orgUnitId: string): Promise<EligiblePublisher[]> {
  const result = await query<EligiblePublisher>(
    `SELECT u.id, u.display_name, u.name_ar, u.name_en, u.email, u.role
     FROM reviewer_org_claims c
     JOIN users u ON u.id = c.reviewer_id
     WHERE c.org_unit_id = $1 AND u.role = 'reviewer' AND u.is_active = TRUE
     ORDER BY u.display_name`,
    [orgUnitId],
  );
  return result.rows;
}

export async function setItemPublisher(
  user: SessionUser,
  itemId: string,
  publisherId: string | null,
): Promise<{ rebuilt: boolean; rebuildError?: string }> {
  if (user.role !== "super_admin") {
    throw new Error("Only Super Admin can set public publisher");
  }
  const meta = await getContentMeta(itemId);
  if (!meta) throw new Error("Not found");
  if (meta.content_type !== "news" && meta.content_type !== "event") {
    throw new Error("Publisher can only be set on news and events");
  }
  if (!(await canViewContentItem(user, meta))) {
    throw new Error("Forbidden");
  }

  if (publisherId) {
    const eligible = await listEligiblePublishers(meta.org_unit_id);
    if (!eligible.some((u) => u.id === publisherId)) {
      throw new Error("Publisher must be an active Reviewer scoped to this organisation");
    }
  }

  const live = await query<{ live_payload: unknown }>(
    `SELECT live_payload FROM content_items WHERE id = $1`,
    [itemId],
  );
  const hadLive = live.rows[0]?.live_payload != null;

  await query(
    `UPDATE content_items SET publisher_id = $2, updated_by = $3, updated_at = NOW() WHERE id = $1`,
    [itemId, publisherId, user.id],
  );

  await writeAudit({
    actor: user,
    action: "content.publisher_set",
    entityType: meta.content_type,
    entityId: itemId,
    summary: publisherId
      ? `Public publisher set on ${meta.content_type}`
      : `Public publisher cleared (fallback) on ${meta.content_type}`,
    metadata: { publisherId },
  });

  if (!hadLive) return { rebuilt: false };

  try {
    if (meta.content_type === "news") await rebuildPublicNewsJson();
    else await rebuildPublicEventsJson();
    return { rebuilt: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rebuild failed";
    return { rebuilt: false, rebuildError: message };
  }
}
