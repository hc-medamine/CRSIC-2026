/**
 * WordPress → CMS/SPA cutover for owned types (PRD 2026-08-21).
 *
 * Usage (from cms/):
 *   npm run db:cutover:wordpress              # dry-run (default)
 *   npm run db:cutover:wordpress -- --apply   # after stakeholder signs the report
 *   npm run db:cutover:wordpress -- --apply --force-volume
 *
 * Default writes tmp/wp-cutover-report.json. No DB/JSON writes until --apply.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { query, pool } from "../src/lib/db";
import { publicPathFor, MEDIA_MAX_BYTES, type MediaBucket } from "../src/lib/media/config";
import { resolvePublicSlug } from "../src/lib/publish/resolveSlug";
import { buildNewsPayloadForItem, rebuildPublicNewsJson } from "../src/lib/publish/newsJson";
import { buildEventPayloadForItem, rebuildPublicEventsJson } from "../src/lib/publish/eventsJson";
import {
  buildPublicationPayload,
  rebuildPublicPublicationsJson,
} from "../src/lib/publish/publicationsJson";
import { buildPartnerPayload, rebuildPublicPartnersJson } from "../src/lib/publish/partnersJson";
import { buildAlertPayload, rebuildPublicAlertsJson } from "../src/lib/publish/alertsJson";
import { buildLawPayload, rebuildPublicLawsJson } from "../src/lib/publish/lawsJson";
import { buildPlatformPayload, rebuildPublicPlatformsJson } from "../src/lib/publish/platformsJson";
import {
  buildResearchGroupPayload,
  rebuildPublicResearchGroupsJson,
} from "../src/lib/publish/researchGroupsJson";
import {
  buildResearchProjectPayload,
  rebuildPublicResearchProjectsJson,
} from "../src/lib/publish/researchProjectsJson";
import type { PublicMediaItem } from "../src/lib/publish/media";
import {
  type CmsRow,
  type CmsType,
  type ScrapedItem,
  VOLUME_SOFT_CAP,
  eventStatusFromYear,
  fetchBuffer,
  matchCmsRow,
  scrapeAllHubs,
  scrapePublicationSearches,
  titlesMatch,
} from "./wp-cutover-lib";

const RUN_ID = `wp-cutover-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const MEGOUSSI = "i.megoussi@crsic.dz";
const MEDJELLED = "t.medjelled@crsic.dz";
const DJEFAL = "a.djefal@crsic.dz";
const DERRAFA = "a.derrafa@crsic.dz";
const BOUFATAH = "f.boufatah@crsic.dz";

const TYPE_BUCKET: Record<CmsType, MediaBucket> = {
  news: "news",
  event: "events",
  publication: "covers",
  partner: "partners",
  alert: "alerts",
  law: "laws",
  platform: "platforms",
  research_group: "research",
  research_project: "research",
};

const CENTRE_TYPES: CmsType[] = ["news", "event", "publication", "partner", "alert", "law", "platform"];

type Staff = { id: string; email: string; display_name: string; role: string };

type PlanRow = {
  action: "update" | "insert" | "skip" | "extra";
  type: CmsType;
  wpTitle: string;
  wpUrl: string;
  cmsId?: string;
  cmsTitle?: string;
  reason: string;
  hasWpImage: boolean;
  willClearMedia: boolean;
};

function repoRoot(): string {
  return join(process.cwd(), "..");
}

function reportPath(): string {
  return join(repoRoot(), "tmp", "wp-cutover-report.json");
}

function editorEmailFor(item: ScrapedItem): string | null {
  if (item.type === "law" || item.type === "platform") return MEDJELLED;
  if (CENTRE_TYPES.includes(item.type) && item.type !== "law" && item.type !== "platform") {
    return MEGOUSSI;
  }
  if (item.type === "research_group" || item.type === "research_project") {
    if (item.orgUnitId === "dept_quran_fiqh" || item.orgUnitId === "dept_thought_dialogue") {
      return DJEFAL;
    }
    if (item.orgUnitId === "dept_algeria_history" || item.orgUnitId === "dept_islamic_civ") {
      return DERRAFA;
    }
    return null;
  }
  return MEGOUSSI;
}

function mimeFrom(url: string, contentType: string): { mime: string; ext: string } | null {
  const ct = contentType.split(";")[0]?.trim().toLowerCase() || "";
  if (ct === "image/jpeg" || ct === "image/jpg") return { mime: "image/jpeg", ext: "jpg" };
  if (ct === "image/png") return { mime: "image/png", ext: "png" };
  if (ct === "image/webp") return { mime: "image/webp", ext: "webp" };
  if (ct === "application/pdf") return { mime: "application/pdf", ext: "pdf" };
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return { mime: "image/png", ext: "png" };
  if (lower.endsWith(".webp")) return { mime: "image/webp", ext: "webp" };
  if (lower.endsWith(".pdf")) return { mime: "application/pdf", ext: "pdf" };
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return { mime: "image/jpeg", ext: "jpg" };
  return null;
}

async function downloadMedia(
  fileUrl: string,
  bucket: MediaBucket,
  uploadedBy: string,
): Promise<string | null> {
  const got = await fetchBuffer(fileUrl);
  if (!got) return null;
  if (got.buffer.byteLength > MEDIA_MAX_BYTES || got.buffer.byteLength < 32) return null;
  const parsed = mimeFrom(fileUrl, got.contentType);
  if (!parsed) return null;
  const inserted = await query<{ id: string }>(
    `INSERT INTO media_assets (
       bucket, original_filename, mime_type, byte_size, extension, public_path, uploaded_by
     ) VALUES (
       $1, $2, $3, $4, $5, 'pending', $6
     ) RETURNING id`,
    [
      bucket,
      fileUrl.split("/").pop()?.slice(0, 180) || `wp.${parsed.ext}`,
      parsed.mime,
      got.buffer.byteLength,
      parsed.ext,
      uploadedBy,
    ],
  );
  const id = inserted.rows[0]?.id;
  if (!id) return null;
  const publicPath = publicPathFor(bucket, id, parsed.ext);
  await query(`UPDATE media_assets SET public_path = $2 WHERE id = $1`, [id, publicPath]);
  const staging = join(process.cwd(), "uploads", `${id}.${parsed.ext}`);
  const publicAbs = join(repoRoot(), ...publicPath.split("/"));
  mkdirSync(dirname(staging), { recursive: true });
  mkdirSync(dirname(publicAbs), { recursive: true });
  writeFileSync(staging, got.buffer);
  writeFileSync(publicAbs, got.buffer);
  return publicPath;
}

async function resolveMedia(
  item: ScrapedItem,
  existingPath: string | null,
  uploadedBy: string,
): Promise<{ imagePath: string | null; attachments: PublicMediaItem[] }> {
  const bucket = TYPE_BUCKET[item.type];
  if (!item.imageUrl) {
    const pdfs: PublicMediaItem[] = [];
    for (const pdf of item.pdfUrls.slice(0, 4)) {
      const path = await downloadMedia(pdf, bucket, uploadedBy);
      if (path) pdfs.push({ kind: "pdf", src: path });
    }
    return { imagePath: null, attachments: pdfs };
  }
  const keepExisting =
    Boolean(existingPath?.startsWith("img/cms/")) &&
    existsSync(join(repoRoot(), ...(existingPath || "").split("/")));
  // Platforms/laws already have curated media; WP landing pages often have none.
  if (!item.imageUrl && (item.type === "platform" || item.type === "law") && keepExisting) {
    return { imagePath: existingPath, attachments: [{ kind: "image", src: existingPath! }] };
  }
  let imagePath = keepExisting ? existingPath : null;
  if (!imagePath) {
    imagePath = await downloadMedia(item.imageUrl, bucket, uploadedBy);
  }
  const attachments: PublicMediaItem[] = [];
  if (imagePath) attachments.push({ kind: "image", src: imagePath });
  for (const pdf of item.pdfUrls.slice(0, 4)) {
    const path = await downloadMedia(pdf, bucket, uploadedBy);
    if (path) attachments.push({ kind: "pdf", src: path });
  }
  return { imagePath, attachments };
}

async function auditPublish(opts: {
  actor: Staff;
  type: CmsType;
  itemId: string;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
}) {
  await query(
    `INSERT INTO audit_log
      (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      opts.actor.id,
      opts.actor.email,
      `${opts.type}.publish`,
      opts.type,
      opts.itemId,
      opts.summary,
      JSON.stringify({ runId: RUN_ID, ...opts.metadata }),
    ],
  );
}

async function loadStaff(): Promise<{
  byEmail: Map<string, Staff>;
  boufatah: Staff;
  sa: Staff;
}> {
  const res = await query<Staff>(
    `SELECT id, email, display_name, role FROM users
     WHERE is_active = TRUE AND email = ANY($1::text[])`,
    [[MEGOUSSI, MEDJELLED, DJEFAL, DERRAFA, BOUFATAH]],
  );
  const byEmail = new Map(res.rows.map((u) => [u.email, u]));
  const boufatah = byEmail.get(BOUFATAH);
  if (!boufatah || boufatah.role !== "reviewer") {
    throw new Error("Reviewer f.boufatah@crsic.dz not found");
  }
  const saRes = await query<Staff>(
    `SELECT id, email, display_name, role FROM users
     WHERE role = 'super_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
  );
  const sa = saRes.rows[0];
  if (!sa) throw new Error("No Super Admin found");
  return { byEmail, boufatah, sa };
}

async function loadCmsRows(): Promise<CmsRow[]> {
  const res = await query<CmsRow>(
    `SELECT id, content_type, title_ar, public_slug, org_unit_id, image_path,
            pub_kind, label_ar, partner_emoji, partner_scope, live_at, published_at
     FROM content_items
     WHERE content_type = ANY($1::text[])
     ORDER BY content_type, created_at`,
    [Object.keys(TYPE_BUCKET)],
  );
  return res.rows;
}

function buildPlan(scraped: ScrapedItem[], cms: CmsRow[]): {
  rows: PlanRow[];
  unmatchedCms: Array<{ id: string; type: string; title: string }>;
} {
  const usedCms = new Set<string>();
  const claimedTitle = new Set<string>();
  const rows: PlanRow[] = [];
  const byType = new Map<CmsType, ScrapedItem[]>();
  for (const item of scraped) {
    const list = byType.get(item.type) ?? [];
    list.push(item);
    byType.set(item.type, list);
  }

  const alertItems = (byType.get("alert") ?? [])
    .slice()
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  const newestAlert = alertItems[0];

  for (const item of scraped) {
    if (item.type === "research_group" || item.type === "research_project") {
      if (!item.orgUnitId) {
        rows.push({
          action: "skip",
          type: item.type,
          wpTitle: item.title,
          wpUrl: item.url,
          reason: "unknown research org_unit — do not guess",
          hasWpImage: Boolean(item.imageUrl),
          willClearMedia: false,
        });
        continue;
      }
    }
    if (item.type === "alert" && newestAlert && item.url !== newestAlert.url) {
      rows.push({
        action: "skip",
        type: "alert",
        wpTitle: item.title,
        wpUrl: item.url,
        reason: "alerts: only newest live banner",
        hasWpImage: Boolean(item.imageUrl),
        willClearMedia: false,
      });
      continue;
    }

    const titleKey = `${item.type}::${item.title}`;
    const alreadyClaimed = [...claimedTitle].some((k) => {
      if (!k.startsWith(`${item.type}::`)) return false;
      return titlesMatch(k.slice(item.type.length + 2), item.title);
    });
    if (alreadyClaimed) {
      rows.push({
        action: "extra",
        type: item.type,
        wpTitle: item.title,
        wpUrl: item.url,
        reason: "duplicate WP title — first match only",
        hasWpImage: Boolean(item.imageUrl),
        willClearMedia: false,
      });
      continue;
    }

    const match = matchCmsRow(
      cms.filter((r) => !usedCms.has(r.id)),
      item,
    );
    if (match) {
      usedCms.add(match.id);
      claimedTitle.add(titleKey);
      rows.push({
        action: "update",
        type: item.type,
        wpTitle: item.title,
        wpUrl: item.url,
        cmsId: match.id,
        cmsTitle: match.title_ar,
        reason: "type+title/slug match — update in place",
        hasWpImage: Boolean(item.imageUrl),
        willClearMedia: !item.imageUrl && Boolean(match.image_path),
      });
      continue;
    }

    claimedTitle.add(titleKey);
    rows.push({
      action: "insert",
      type: item.type,
      wpTitle: item.title,
      wpUrl: item.url,
      reason: "no CMS match — insert published",
      hasWpImage: Boolean(item.imageUrl),
      willClearMedia: false,
    });
  }

  const unmatchedCms = cms
    .filter((r) => !usedCms.has(r.id))
    .map((r) => ({ id: r.id, type: r.content_type, title: r.title_ar }));

  return { rows, unmatchedCms };
}

function backupPublicJson(): string {
  const stamp = RUN_ID;
  const dest = join(repoRoot(), "tmp", stamp, "json");
  mkdirSync(dest, { recursive: true });
  const dataDir = join(repoRoot(), "data");
  for (const name of readdirSync(dataDir)) {
    if (!name.endsWith(".json")) continue;
    copyFileSync(join(dataDir, name), join(dest, name));
  }
  return dest;
}

async function applyRow(
  item: ScrapedItem,
  plan: PlanRow,
  staff: { byEmail: Map<string, Staff>; boufatah: Staff; sa: Staff },
): Promise<string> {
  const email = editorEmailFor(item);
  if (!email) throw new Error(`No editor for ${item.type} ${item.url}`);
  const editor = staff.byEmail.get(email);
  if (!editor) throw new Error(`Staff ${email} not seeded`);

  if (plan.action === "update" && plan.cmsId) {
    const current = await query<{
      id: string;
      title_ar: string;
      public_slug: string | null;
      image_path: string | null;
      label_ar: string | null;
      pub_kind: "collective" | "individual" | null;
      partner_emoji: string | null;
      partner_scope: "intl" | "nat" | null;
      partner_date: string | null;
      event_scope: "intl" | "nat" | null;
      event_day: string | null;
      event_month: string | null;
      event_year: string | null;
      event_type_ar: string | null;
      event_display_status: "upcoming" | "ongoing" | "done" | null;
      org_unit_id: string;
      platform_kind: "visual" | "radio" | "mobility" | null;
      research_group_id: string | null;
      research_lead_ar: string | null;
      research_members: unknown;
      research_questions_ar: string | null;
      research_axes: unknown;
      research_duration_ar: string | null;
      research_impacts: unknown;
      external_url: string | null;
      attachments: unknown;
      meta_title_ar: string | null;
      meta_title_en: string | null;
      meta_description_ar: string | null;
      meta_description_en: string | null;
      og_image: string | null;
      title_en: string | null;
      summary_en: string | null;
      body_en: string | null;
    }>(`SELECT * FROM content_items WHERE id = $1`, [plan.cmsId]);
    const row = current.rows[0];
    if (!row) throw new Error(`Missing CMS row ${plan.cmsId}`);

    const media = await resolveMedia(item, row.image_path, editor.id);
    const titleAr = item.type === "partner" ? row.title_ar : item.title;
    const labelAr =
      item.type === "partner" || (item.type === "publication" && row.label_ar?.trim())
        ? row.label_ar
        : item.newsLabel || row.label_ar;
    const pubKind =
      item.type === "publication" && row.pub_kind ? row.pub_kind : row.pub_kind;
    const partnerEmoji = item.type === "partner" ? row.partner_emoji : row.partner_emoji;
    const slug = await resolvePublicSlug({
      itemId: row.id,
      titleAr,
      existingSlug: row.public_slug,
    });

    await query(
      `UPDATE content_items SET
         title_ar = $2,
         summary_ar = $3,
         body_ar = $4,
         image_path = $5,
         og_image = $5,
         attachments = $6::jsonb,
         label_ar = COALESCE($7, label_ar),
         event_scope = COALESCE($8, event_scope),
         event_day = COALESCE($9, event_day),
         event_month = COALESCE($10, event_month),
         event_year = COALESCE($11, event_year),
         event_type_ar = COALESCE($12, event_type_ar),
         event_display_status = COALESCE($13, event_display_status),
         partner_scope = COALESCE($14, partner_scope),
         platform_kind = COALESCE($15, platform_kind),
         created_by = $16,
         review_owner_id = $17,
         updated_by = $16,
         public_slug = $18,
         en_status = CASE WHEN COALESCE(title_en, '') = '' THEN 'pending' ELSE en_status END,
         status = 'published',
         published_at = COALESCE(published_at, NOW()),
         live_at = NOW(),
         checklist_confirmed = TRUE,
         updated_at = NOW()
       WHERE id = $1`,
      [
        row.id,
        titleAr,
        item.summaryAr || null,
        item.bodyAr || null,
        media.imagePath,
        JSON.stringify(media.attachments),
        labelAr,
        item.eventScope ?? null,
        item.eventDay ?? null,
        item.eventMonth ?? null,
        item.eventYear ?? null,
        item.eventTypeAr ?? null,
        item.eventYear ? eventStatusFromYear(item.eventYear) : null,
        item.partnerScope ?? null,
        item.platformKind ?? null,
        editor.id,
        staff.boufatah.id,
        slug,
      ],
    );

    const fresh = await query(`SELECT * FROM content_items WHERE id = $1`, [row.id]);
    const live = await buildLivePayload(fresh.rows[0] as Record<string, unknown>, slug, item.publishedAt);
    await query(`UPDATE content_items SET live_payload = $2::jsonb WHERE id = $1`, [
      row.id,
      JSON.stringify(live),
    ]);
    await auditPublish({
      actor: staff.boufatah,
      type: item.type,
      itemId: row.id,
      title: titleAr,
      summary: `WP cutover update "${titleAr}"`,
      metadata: { wpUrl: item.url, action: "update", pubKind, partnerEmoji },
    });
    return row.id;
  }

  const orgUnitId =
    item.type === "research_group" || item.type === "research_project"
      ? item.orgUnitId
      : "centre_wide";
  if (!orgUnitId) throw new Error("org_unit required");

  const inserted = await query<{ id: string }>(
    `INSERT INTO content_items (
       content_type, status, org_unit_id, created_by, updated_by, review_owner_id, en_status,
       title_ar, summary_ar, body_ar, label_ar,
       event_scope, event_day, event_month, event_year, event_type_ar, event_display_status,
       partner_scope, platform_kind,
       checklist_confirmed, published_at, live_at
     ) VALUES (
       $1, 'published', $2, $3, $3, $4, 'pending',
       $5, $6, $7, $8,
       $9, $10, $11, $12, $13, $14,
       $15, $16,
       TRUE, NOW(), NOW()
     ) RETURNING id`,
    [
      item.type,
      orgUnitId,
      editor.id,
      staff.boufatah.id,
      item.title,
      item.summaryAr || null,
      item.bodyAr || null,
      item.newsLabel || item.eventTypeAr || null,
      item.eventScope ?? null,
      item.eventDay ?? null,
      item.eventMonth ?? null,
      item.eventYear ?? null,
      item.eventTypeAr ?? null,
      item.eventYear ? eventStatusFromYear(item.eventYear) : null,
      item.partnerScope ?? null,
      item.platformKind ?? null,
    ],
  );
  const id = inserted.rows[0].id;
  const slug = await resolvePublicSlug({ itemId: id, titleAr: item.title, existingSlug: null });
  const media = await resolveMedia(item, null, editor.id);
  await query(
    `UPDATE content_items SET
       public_slug = $2, image_path = $3, og_image = $3, attachments = $4::jsonb
     WHERE id = $1`,
    [id, slug, media.imagePath, JSON.stringify(media.attachments)],
  );
  const fresh = await query(`SELECT * FROM content_items WHERE id = $1`, [id]);
  const live = await buildLivePayload(fresh.rows[0] as Record<string, unknown>, slug, item.publishedAt);
  await query(`UPDATE content_items SET live_payload = $2::jsonb WHERE id = $1`, [
    id,
    JSON.stringify(live),
  ]);
  await auditPublish({
    actor: staff.boufatah,
    type: item.type,
    itemId: id,
    title: item.title,
    summary: `WP cutover insert "${item.title}"`,
    metadata: { wpUrl: item.url, action: "insert" },
  });
  return id;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" ? v : v == null ? null : String(v);
}

async function buildLivePayload(
  row: Record<string, unknown>,
  slug: string,
  wpDate?: string | null,
): Promise<unknown> {
  const type = row.content_type as CmsType;
  const base = {
    id: String(row.id),
    title_ar: String(row.title_ar ?? ""),
    title_en: asStr(row.title_en),
    label_ar: asStr(row.label_ar),
    summary_ar: asStr(row.summary_ar),
    summary_en: asStr(row.summary_en),
    body_ar: asStr(row.body_ar),
    body_en: asStr(row.body_en),
    image_path: asStr(row.image_path),
    image_alt_ar: asStr(row.image_alt_ar),
    public_slug: slug,
    attachments: row.attachments,
    meta_title_ar: asStr(row.meta_title_ar),
    meta_title_en: asStr(row.meta_title_en),
    meta_description_ar: asStr(row.meta_description_ar),
    meta_description_en: asStr(row.meta_description_en),
    og_image: asStr(row.og_image),
    published_at: (row.published_at as Date | string | null) ?? null,
    live_payload: (row.live_payload as Record<string, unknown> | null) ?? null,
    wp_date: wpDate ?? null,
  };
  if (type === "news") return buildNewsPayloadForItem(base);
  if (type === "event") {
    return buildEventPayloadForItem({
      ...base,
      event_day: asStr(row.event_day),
      event_month: asStr(row.event_month),
      event_year: asStr(row.event_year),
      event_type_ar: asStr(row.event_type_ar),
      event_display_status: (asStr(row.event_display_status) as "upcoming" | "ongoing" | "done") || "done",
      event_scope: (asStr(row.event_scope) as "intl" | "nat") || "nat",
    });
  }
  if (type === "publication") {
    return buildPublicationPayload({
      ...base,
      pub_kind: (asStr(row.pub_kind) as "collective" | "individual") || "collective",
    });
  }
  if (type === "partner") {
    return buildPartnerPayload({
      ...base,
      partner_date: asStr(row.partner_date),
      partner_emoji: asStr(row.partner_emoji),
      partner_scope: (asStr(row.partner_scope) as "intl" | "nat") || "nat",
    });
  }
  if (type === "alert") {
    return buildAlertPayload({
      id: base.id,
      title_ar: base.title_ar,
      title_en: base.title_en,
      alert_link_url: asStr(row.alert_link_url),
      alert_link_label_ar: asStr(row.alert_link_label_ar),
      alert_link_label_en: asStr(row.alert_link_label_en),
      meta_title_ar: base.meta_title_ar,
      meta_title_en: base.meta_title_en,
      meta_description_ar: base.meta_description_ar,
      meta_description_en: base.meta_description_en,
      og_image: base.og_image,
    });
  }
  if (type === "law") {
    return buildLawPayload({
      ...base,
      external_url: asStr(row.external_url),
    });
  }
  if (type === "platform") {
    return buildPlatformPayload({
      ...base,
      external_url: asStr(row.external_url),
      platform_kind: (asStr(row.platform_kind) as "visual" | "radio" | "mobility") || "visual",
    });
  }
  if (type === "research_group") {
    return buildResearchGroupPayload({
      ...base,
      org_unit_id: String(row.org_unit_id),
      research_lead_ar: asStr(row.research_lead_ar),
      research_lead_en: asStr(row.research_lead_en),
      research_members: row.research_members,
    });
  }
  return buildResearchProjectPayload({
    ...base,
    org_unit_id: String(row.org_unit_id),
    research_group_id: asStr(row.research_group_id),
    research_lead_ar: asStr(row.research_lead_ar),
    research_lead_en: asStr(row.research_lead_en),
    research_questions_ar: asStr(row.research_questions_ar),
    research_questions_en: asStr(row.research_questions_en),
    research_axes: row.research_axes,
    research_duration_ar: asStr(row.research_duration_ar),
    research_duration_en: asStr(row.research_duration_en),
    research_impacts: row.research_impacts,
  });
}

async function rebuildAll(): Promise<Record<string, unknown>> {
  return {
    news: await rebuildPublicNewsJson(),
    events: await rebuildPublicEventsJson(),
    publications: await rebuildPublicPublicationsJson(),
    partners: await rebuildPublicPartnersJson(),
    alerts: await rebuildPublicAlertsJson(),
    laws: await rebuildPublicLawsJson(),
    platforms: await rebuildPublicPlatformsJson(),
    researchGroups: await rebuildPublicResearchGroupsJson(),
    researchProjects: await rebuildPublicResearchProjectsJson(),
  };
}

function printSummary(plan: PlanRow[], unmatchedCms: Array<{ type: string }>, scrapedN: number) {
  const count = (action: PlanRow["action"]) => plan.filter((r) => r.action === action).length;
  const byType: Record<string, number> = {};
  for (const r of plan) {
    if (r.action === "skip" || r.action === "extra") continue;
    byType[r.type] = (byType[r.type] || 0) + 1;
  }
  console.log(`Scraped ${scrapedN} WP items`);
  console.log(`Plan: update=${count("update")} insert=${count("insert")} skip=${count("skip")} extra=${count("extra")}`);
  console.log(`Unmatched CMS rows: ${unmatchedCms.length}`);
  console.log("Mapped by type:", byType);
  if (scrapedN > VOLUME_SOFT_CAP) {
    console.log(
      `\nVOLUME: ${scrapedN} > ${VOLUME_SOFT_CAP}. Public SPA list pagination is deferred. Sign a date cap or pass --force-volume before --apply.`,
    );
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const forceVolume = process.argv.includes("--force-volume");
  console.log(apply ? `Mode: APPLY (${RUN_ID})` : `Mode: DRY-RUN (${RUN_ID})`);

  const staff = await loadStaff();
  const cms = await loadCmsRows();
  console.log(`CMS owned rows: ${cms.length}`);

  const scrapedHubs = await scrapeAllHubs((msg) => console.log(msg));
  const pubTitles = cms.filter((r) => r.content_type === "publication").map((r) => r.title_ar);
  const scrapedPubs = await scrapePublicationSearches(pubTitles, (msg) => console.log(msg));
  const scraped = [...scrapedHubs, ...scrapedPubs];
  const { rows, unmatchedCms } = buildPlan(scraped, cms);
  printSummary(rows, unmatchedCms, scraped.length);

  const report = {
    runId: RUN_ID,
    mode: apply ? "apply" : "dry-run",
    scraped: scraped.length,
    plan: rows,
    unmatchedCms,
    volumeSoftCap: VOLUME_SOFT_CAP,
    overVolume: scraped.length > VOLUME_SOFT_CAP,
  };
  mkdirSync(dirname(reportPath()), { recursive: true });
  writeFileSync(reportPath(), JSON.stringify(report, null, 2), "utf8");
  console.log(`Report: ${reportPath()}`);

  if (!apply) {
    console.log("No DB/JSON writes. Re-run with --apply after signing the report.");
    await pool.end();
    return;
  }

  if (scraped.length > VOLUME_SOFT_CAP && !forceVolume) {
    console.error("Refusing --apply over volume cap. Pass --force-volume after a date-cap decision.");
    await pool.end();
    process.exit(2);
  }

  const backupDir = backupPublicJson();
  console.log(`JSON backup: ${backupDir}`);
  console.log("Take a DB dump before relying on rollback (see docs/runbooks/CMS-OPS.md).");

  const scrapedByUrl = new Map(scraped.map((s) => [s.url, s]));
  let applied = 0;
  for (const row of rows) {
    if (row.action !== "update" && row.action !== "insert") continue;
    const item = scrapedByUrl.get(row.wpUrl);
    if (!item) continue;
    try {
      await applyRow(item, row, staff);
      applied += 1;
      console.log(`${row.action} ${row.type}: ${row.wpTitle.slice(0, 72)}`);
    } catch (err) {
      console.error(`FAIL ${row.type} ${row.wpUrl}`, err);
    }
  }

  const rebuilt = await rebuildAll();
  await query(
    `INSERT INTO audit_log
      (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
     VALUES ($1, $2, $3, $4, NULL, $5, $6::jsonb)`,
    [
      staff.sa.id,
      staff.sa.email,
      "content.wp_cutover",
      "ops",
      `WordPress cutover apply ${RUN_ID} (${applied} rows)`,
      JSON.stringify({ runId: RUN_ID, applied, rebuilt, backupDir }),
    ],
  );
  console.log(`Applied ${applied}. Rebuilt public JSON.`, rebuilt);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
