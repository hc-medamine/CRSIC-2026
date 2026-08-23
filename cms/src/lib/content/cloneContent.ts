import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { ALL_CONTENT_TYPES, type ContentType } from "@/lib/content-types";
import {
  assertOrgAllowsContentType,
  canAccessContentType,
  canAccessOrg,
} from "@/lib/content/permissions";
import { canViewContentItem } from "@/lib/content/revisions";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import {
  NEWS_BULK_MAX_IDS,
  parseNewsBulkIds,
  type NewsBulkItemRef,
  type NewsBulkResult,
  type NewsBulkSkip,
  type NewsBulkSkipReason,
} from "@/lib/content/newsBulk";

export const CLONE_TITLE_SUFFIX_AR = " (نسخة)";
export const CLONE_TITLE_SUFFIX_EN = " (copy)";

export type CloneItemRef = NewsBulkItemRef & {
  contentType: ContentType;
  href: string;
};

export type CloneSkipReason = NewsBulkSkipReason | "no_create" | "wrong_type";

type SourceRow = {
  id: string;
  content_type: ContentType;
  status: string;
  org_unit_id: string;
  created_by: string;
  recycled_at: Date | null;
  en_status: string;
  title_ar: string;
  title_en: string | null;
  label_ar: string | null;
  label_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  event_scope: string | null;
  event_day: string | null;
  event_month: string | null;
  event_year: string | null;
  event_type_ar: string | null;
  event_type_en: string | null;
  event_display_status: string | null;
  pub_kind: string | null;
  partner_scope: string | null;
  partner_date: string | null;
  partner_emoji: string | null;
  alert_link_url: string | null;
  alert_link_label_ar: string | null;
  alert_link_label_en: string | null;
  external_url: string | null;
  platform_kind: string | null;
  research_group_id: string | null;
  research_lead_ar: string | null;
  research_lead_en: string | null;
  research_members: unknown;
  research_questions_ar: string | null;
  research_questions_en: string | null;
  research_axes: unknown;
  research_duration_ar: string | null;
  research_duration_en: string | null;
  research_impacts: unknown;
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
};

export const CONTENT_EDIT_HREF: Record<ContentType, string> = {
  news: "/dashboard/news",
  event: "/dashboard/events",
  publication: "/dashboard/publications",
  partner: "/dashboard/partners",
  alert: "/dashboard/alerts",
  law: "/dashboard/laws",
  platform: "/dashboard/platforms",
  research_group: "/dashboard/research-groups",
  research_project: "/dashboard/research-projects",
};

export function isCloneableType(value: string): value is ContentType {
  return (ALL_CONTENT_TYPES as string[]).includes(value);
}

export function cloneTitles(
  titleAr: string,
  titleEn: string | null | undefined,
): { titleAr: string; titleEn: string | null } {
  const en = titleEn?.trim() ? `${titleEn}${CLONE_TITLE_SUFFIX_EN}` : titleEn?.trim() || null;
  return {
    titleAr: `${titleAr}${CLONE_TITLE_SUFFIX_AR}`,
    titleEn: en,
  };
}

export function skipReasonFromCloneError(err: unknown): { reason: CloneSkipReason; detail: string } {
  const detail = err instanceof Error ? err.message : "Action failed";
  if (detail === "Not found") return { reason: "not_found", detail };
  if (detail.includes("already in the recycle bin")) return { reason: "already_binned", detail };
  if (detail === "Wrong content type") return { reason: "wrong_type", detail };
  if (detail.includes("No permission to create") || detail.includes("does not allow content type")) {
    return { reason: "no_create", detail };
  }
  if (detail.includes("No permission for this organisation")) return { reason: "no_create", detail };
  if (detail === "Reviewer role required") return { reason: "reviewer_required", detail };
  return { reason: "other", detail };
}

function jsonParam(value: unknown): string {
  if (value == null) return "[]";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function loadSource(id: string): Promise<SourceRow | null> {
  const result = await query<SourceRow>(
    `SELECT id, content_type, status, org_unit_id, created_by, recycled_at, en_status,
            title_ar, title_en, label_ar, label_en, summary_ar, summary_en, body_ar, body_en,
            event_scope, event_day, event_month, event_year, event_type_ar, event_type_en,
            event_display_status, pub_kind, partner_scope, partner_date, partner_emoji,
            alert_link_url, alert_link_label_ar, alert_link_label_en, external_url, platform_kind,
            research_group_id, research_lead_ar, research_lead_en, research_members,
            research_questions_ar, research_questions_en, research_axes,
            research_duration_ar, research_duration_en, research_impacts,
            meta_title_ar, meta_title_en, meta_description_ar, meta_description_en
     FROM content_items WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function cloneContentItem(
  user: SessionUser,
  sourceId: string,
  expectedType?: ContentType,
): Promise<CloneItemRef> {
  const source = await loadSource(sourceId);
  if (!source) throw new Error("Not found");
  if (source.recycled_at) throw new Error("Item is already in the recycle bin");
  if (!isCloneableType(source.content_type)) throw new Error("Wrong content type");
  if (expectedType && source.content_type !== expectedType) throw new Error("Wrong content type");

  const visible = await canViewContentItem(user, {
    id: source.id,
    content_type: source.content_type,
    org_unit_id: source.org_unit_id,
    created_by: source.created_by,
  });
  if (!visible) throw new Error("Not found");

  if (!(await canAccessContentType(user, source.content_type))) {
    throw new Error("No permission to create this content type");
  }
  if (!(await canAccessOrg(user, source.org_unit_id))) {
    throw new Error("No permission for this organisation unit");
  }
  await assertOrgAllowsContentType(source.org_unit_id, source.content_type);

  const titles = cloneTitles(source.title_ar, source.title_en);
  const newId = randomUUID();
  const slug = await resolvePublicSlug({
    itemId: newId,
    titleAr: titles.titleAr,
    existingSlug: null,
  });

  const inserted = await query<{ id: string; title_ar: string; content_type: ContentType }>(
    `INSERT INTO content_items (
      id, content_type, status, org_unit_id, created_by, updated_by, en_status,
      title_ar, title_en, label_ar, label_en, summary_ar, summary_en, body_ar, body_en,
      image_path, image_alt_ar, image_alt_en, attachments, og_image,
      checklist_confirmed, review_note, public_slug, published_at, live_payload, live_at,
      event_scope, event_day, event_month, event_year, event_type_ar, event_type_en, event_display_status,
      pub_kind, partner_scope, partner_date, partner_emoji,
      alert_link_url, alert_link_label_ar, alert_link_label_en, external_url, platform_kind,
      research_group_id, research_lead_ar, research_lead_en, research_members,
      research_questions_ar, research_questions_en, research_axes,
      research_duration_ar, research_duration_en, research_impacts,
      meta_title_ar, meta_title_en, meta_description_ar, meta_description_en,
      review_owner_id, review_owner_proposed_id, review_owner_proposed_by,
      review_owner_proposed_at, escalated_at,
      emergency_published_at, emergency_published_by, emergency_reason, needs_post_review,
      publisher_id
    ) VALUES (
      $1, $2, 'draft', $3, $4, $4, $5,
      $6, $7, $8, $9, $10, $11, $12, $13,
      NULL, NULL, NULL, '[]'::jsonb, NULL,
      FALSE, NULL, $14, NULL, NULL, NULL,
      $15, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25,
      $26, $27, $28, $29, $30,
      $31, $32, $33, $34::jsonb,
      $35, $36, $37::jsonb,
      $38, $39, $40::jsonb,
      $41, $42, $43, $44,
      NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, FALSE,
      NULL
    ) RETURNING id, title_ar, content_type`,
    [
      newId,
      source.content_type,
      source.org_unit_id,
      user.id,
      source.en_status,
      titles.titleAr,
      titles.titleEn,
      source.label_ar,
      source.label_en,
      source.summary_ar,
      source.summary_en,
      source.body_ar,
      source.body_en,
      slug,
      source.event_scope,
      source.event_day,
      source.event_month,
      source.event_year,
      source.event_type_ar,
      source.event_type_en,
      source.event_display_status,
      source.pub_kind,
      source.partner_scope,
      source.partner_date,
      source.partner_emoji,
      source.alert_link_url,
      source.alert_link_label_ar,
      source.alert_link_label_en,
      source.external_url,
      source.platform_kind,
      source.research_group_id,
      source.research_lead_ar,
      source.research_lead_en,
      jsonParam(source.research_members),
      source.research_questions_ar,
      source.research_questions_en,
      jsonParam(source.research_axes),
      source.research_duration_ar,
      source.research_duration_en,
      jsonParam(source.research_impacts),
      source.meta_title_ar,
      source.meta_title_en,
      source.meta_description_ar,
      source.meta_description_en,
    ],
  );
  const item = inserted.rows[0];

  await query(
    `INSERT INTO content_revisions
      (content_item_id, revision_number, status, snapshot, change_summary, created_by)
     VALUES ($1, 1, 'draft', $2::jsonb, $3, $4)`,
    [
      item.id,
      JSON.stringify({
        status: "draft",
        title_ar: item.title_ar,
        cloned_from: source.id,
      }),
      `Cloned from ${source.id}`,
      user.id,
    ],
  );

  await writeAudit({
    actor: user,
    action: `${item.content_type}.clone`,
    entityType: item.content_type,
    entityId: item.id,
    summary: `${item.content_type}.clone — ${item.title_ar}`,
    metadata: { status: "draft", title: item.title_ar, source_id: source.id },
  });

  return {
    id: item.id,
    title: item.title_ar,
    contentType: item.content_type,
    href: `${CONTENT_EDIT_HREF[item.content_type]}/${item.id}`,
  };
}

export async function undoCloneContentItem(user: SessionUser, cloneId: string): Promise<NewsBulkItemRef> {
  const row = await query<{
    id: string;
    title_ar: string;
    status: string;
    created_by: string;
    recycled_at: Date | null;
    content_type: string;
  }>(
    `SELECT id, title_ar, status, created_by, recycled_at, content_type
     FROM content_items WHERE id = $1`,
    [cloneId],
  );
  const item = row.rows[0];
  if (!item) throw new Error("Not found");
  if (item.recycled_at) throw new Error("Item is already in the recycle bin");
  if (item.created_by !== user.id) throw new Error("Only the author can cancel this clone");
  if (item.status !== "draft") throw new Error("Only a draft can be cancelled");

  await query(`DELETE FROM content_items WHERE id = $1`, [cloneId]);
  await writeAudit({
    actor: user,
    action: `${item.content_type}.clone_undo`,
    entityType: item.content_type,
    entityId: item.id,
    summary: `${item.content_type}.clone_undo — ${item.title_ar}`,
    metadata: { title: item.title_ar },
  });
  return { id: item.id, title: item.title_ar };
}

export async function bulkCloneActions(
  user: SessionUser,
  rawIds: unknown,
  expectedType: ContentType,
): Promise<NewsBulkResult> {
  const { ids, skipped } = parseNewsBulkIds(rawIds);
  const done: NewsBulkItemRef[] = [];

  if (user.role === "editor") {
    for (const id of ids) {
      skipped.push({ id, title: "", reason: "reviewer_required" });
    }
    return { done, skipped };
  }

  for (const id of ids) {
    try {
      const cloned = await cloneContentItem(user, id, expectedType);
      done.push({ id: cloned.id, title: cloned.title });
    } catch (err) {
      const mapped = skipReasonFromCloneError(err);
      const source = await loadSource(id);
      skipped.push({
        id,
        title: source?.title_ar ?? "",
        reason: mapped.reason as NewsBulkSkipReason,
        detail: mapped.detail,
      });
    }
  }

  return { done, skipped };
}

export { NEWS_BULK_MAX_IDS };
export type { NewsBulkSkip };
