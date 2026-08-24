import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import type { ContentType } from "@/lib/content-types";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";
import { createMediaUpload } from "@/lib/media/store";
import { ALLOWED_MIME } from "@/lib/media/config";
import { resolvePublicSlug } from "@/lib/publish/resolveSlug";
import { packZip, unpackZip } from "@/lib/content/zipStore";
import {
  bucketForContentType,
  collectZipMediaPaths,
  importAlwaysDraft,
  isExportableType,
  parseManifest,
  remainingExportIds,
  resolveImportAuthor,
  selectedExportError,
  shouldExportRow,
  uniqueExportIds,
  zipFileNameForPath,
  CMS_ZIP_FORMAT,
  CMS_ZIP_VERSION,
  EXPORT_PAGE_SIZE,
  EXPORT_SELECT_REQUIRED,
  type CmsZipItem,
  type CmsZipManifest,
  type ImportReport,
  type ExportPickerRow,
} from "@/lib/content/importExportLogic";
import { contentListSqlOrderBy, type HeaderSort } from "@/lib/content/headerSort";
import { paginationBounds, parseListPage, trimHasMore } from "@/lib/content/listPagination";

export type { ImportReport, ImportReportItem, ExportPickerRow } from "@/lib/content/importExportLogic";
export {
  EXPORT_COUNT_WARN,
  EXPORT_NONE_REMAINING,
  EXPORT_PAGE_SIZE,
  EXPORT_SELECT_REQUIRED,
  isExportableType,
} from "@/lib/content/importExportLogic";

type ExportRow = CmsZipItem & {
  recycled_at: Date | null;
};

function publicRepoRoot(): string {
  return join(process.cwd(), "..");
}

function absolutePublicPath(publicPath: string): string {
  return join(publicRepoRoot(), ...publicPath.split("/"));
}

function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function jsonParam(value: unknown): string {
  if (value == null) return "[]";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const SELECT_EXPORT = `
  SELECT ci.id AS source_id, ci.content_type, ci.org_unit_id, ci.en_status,
         ci.title_ar, ci.title_en, ci.label_ar, ci.label_en, ci.summary_ar, ci.summary_en,
         ci.body_ar, ci.body_en, ci.image_path, ci.image_card_path, ci.image_alt_ar, ci.image_alt_en,
         ci.attachments, ci.og_image, ci.event_scope, ci.event_day, ci.event_month, ci.event_year,
         ci.event_type_ar, ci.event_type_en, ci.event_display_status, ci.pub_kind,
         ci.partner_scope, ci.partner_date, ci.partner_emoji,
         ci.alert_link_url, ci.alert_link_label_ar, ci.alert_link_label_en,
         ci.external_url, ci.platform_kind, ci.research_group_id,
         ci.research_lead_ar, ci.research_lead_en, ci.research_members,
         ci.research_questions_ar, ci.research_questions_en, ci.research_axes,
         ci.research_duration_ar, ci.research_duration_en, ci.research_impacts,
         ci.meta_title_ar, ci.meta_title_en, ci.meta_description_ar, ci.meta_description_en,
         ci.recycled_at, u.email AS author_email
  FROM content_items ci
  LEFT JOIN users u ON u.id = ci.created_by
`;

function toZipItem(row: ExportRow): CmsZipItem {
  const item = { ...row };
  delete (item as { recycled_at?: Date | null }).recycled_at;
  return item;
}

async function loadExportRows(
  type: ContentType,
  opts?: { itemId?: string; ids?: string[] },
): Promise<ExportRow[]> {
  if (opts?.ids && opts.ids.length > 0) {
    const ids = uniqueExportIds(opts.ids);
    if (ids.length === 0) return [];
    const result = await query<ExportRow>(
      `${SELECT_EXPORT} WHERE ci.content_type = $1 AND ci.id = ANY($2::uuid[])`,
      [type, ids],
    );
    const byId = new Map(result.rows.map((row) => [row.source_id.toLowerCase(), row]));
    return remainingExportIds(
      ids,
      result.rows.map((row) => row.source_id),
    )
      .map((id) => byId.get(id))
      .filter((row): row is ExportRow => Boolean(row));
  }
  if (opts?.itemId) {
    const result = await query<ExportRow>(`${SELECT_EXPORT} WHERE ci.id = $1 AND ci.content_type = $2`, [
      opts.itemId,
      type,
    ]);
    return result.rows;
  }
  const result = await query<ExportRow>(
    `${SELECT_EXPORT}
     WHERE ci.content_type = $1
     ORDER BY ci.updated_at DESC, ci.id ASC`,
    [type],
  );
  return result.rows;
}

export async function listExportPicker(
  type: ContentType,
  opts: { q?: string; page?: number | string | null; sort?: HeaderSort | null } = {},
): Promise<{ items: ExportPickerRow[]; hasMore: boolean; page: number }> {
  const q = (opts.q ?? "").trim();
  const bounds = paginationBounds(parseListPage(opts.page), EXPORT_PAGE_SIZE, "page");
  const orderBy = contentListSqlOrderBy(opts.sort ?? null);
  const params: unknown[] = [type];
  let where = `content_type = $1 AND recycled_at IS NULL`;
  if (q) {
    params.push(`%${q}%`);
    where += ` AND title_ar ILIKE $${params.length}`;
  }
  params.push(bounds.limit);
  const limitIdx = params.length;
  params.push(bounds.offset);
  const offsetIdx = params.length;
  const result = await query<ExportPickerRow>(
    `SELECT id, title_ar AS "titleAr", status, updated_at AS "updatedAt"
     FROM content_items
     WHERE ${where}
     ${orderBy}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );
  const trimmed = trimHasMore(result.rows, bounds.take);
  return { ...trimmed, page: bounds.page };
}

export async function countExportable(type: ContentType): Promise<number> {
  const result = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM content_items
     WHERE content_type = $1 AND recycled_at IS NULL`,
    [type],
  );
  return Number(result.rows[0]?.n ?? 0);
}

export async function buildExportZip(
  user: SessionUser,
  type: ContentType,
  opts?: { itemId?: string; ids?: string[] },
): Promise<{ filename: string; buffer: Buffer; count: number }> {
  if (user.role !== "super_admin") throw new Error("Super Admin role required");
  if (!isExportableType(type)) throw new Error("Unknown content type");

  const selectedIds = opts?.ids ? uniqueExportIds(opts.ids) : undefined;
  if (opts?.ids && selectedIds && selectedIds.length === 0) {
    throw new Error(EXPORT_SELECT_REQUIRED);
  }

  const rows = (await loadExportRows(type, { itemId: opts?.itemId, ids: selectedIds })).filter((row) =>
    shouldExportRow(row.recycled_at),
  );
  if (opts?.itemId && rows.length === 0) throw new Error("Not found");
  if (selectedIds) {
    const remainingErr = selectedExportError(rows.length);
    if (remainingErr) throw new Error(remainingErr);
  }

  const items = rows.map(toZipItem);
  const fileMap = new Map<string, Buffer>();
  for (const item of items) {
    for (const path of collectZipMediaPaths(item)) {
      if (fileMap.has(path)) continue;
      const abs = absolutePublicPath(path);
      if (!existsSync(abs)) continue;
      if (!abs.startsWith(publicRepoRoot())) continue;
      fileMap.set(path, readFileSync(abs));
    }
  }

  const manifest: CmsZipManifest = {
    format: CMS_ZIP_FORMAT,
    version: CMS_ZIP_VERSION,
    exported_at: new Date().toISOString(),
    content_type: type,
    items,
  };

  const entries = [
    { name: "manifest.json", data: Buffer.from(JSON.stringify(manifest), "utf8") },
    ...[...fileMap.entries()].map(([path, data]) => ({
      name: zipFileNameForPath(path),
      data,
    })),
  ];
  const buffer = packZip(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = selectedIds
    ? `crsic-${type}-selected-${stamp}.zip`
    : opts?.itemId
      ? `crsic-${type}-item-${stamp}.zip`
      : `crsic-${type}-${stamp}.zip`;

  await writeAudit({
    actor: user,
    action: `${type}.export`,
    entityType: type,
    entityId: opts?.itemId ?? type,
    summary: `Exported ${items.length} ${type} item(s) as zip`,
    metadata: {
      count: items.length,
      itemId: opts?.itemId ?? null,
      selected: Boolean(selectedIds),
      bytes: buffer.length,
    },
  });

  return { filename, buffer, count: items.length };
}

async function remapMediaPath(
  user: SessionUser,
  type: ContentType,
  oldPath: string | null,
  files: Map<string, Buffer>,
  notes: string[],
): Promise<string | null> {
  if (!oldPath || !oldPath.startsWith("img/")) return null;
  const data = files.get(zipFileNameForPath(oldPath));
  if (!data) {
    notes.push("missing_file");
    return null;
  }
  const mime = mimeFromName(oldPath);
  if (!(mime in ALLOWED_MIME)) {
    notes.push("missing_file");
    return null;
  }
  const file = new File([data], oldPath.split("/").pop() || "file", { type: mime });
  try {
    const asset = await createMediaUpload(user, file, bucketForContentType(type), {
      imagesOnly: mime !== "application/pdf",
    });
    return asset.public_path;
  } catch (err) {
    notes.push(err instanceof Error ? err.message : "upload_failed");
    return null;
  }
}

function remapAttachments(
  attachments: unknown,
  pathMap: Map<string, string | null>,
): unknown[] {
  if (!Array.isArray(attachments)) return [];
  const out: unknown[] = [];
  for (const entry of attachments) {
    if (!entry || typeof entry !== "object") continue;
    const src = (entry as { src?: unknown }).src;
    if (typeof src !== "string") {
      out.push(entry);
      continue;
    }
    const mapped = pathMap.has(src) ? pathMap.get(src) : src;
    if (!mapped) continue;
    out.push({ ...entry, src: mapped });
  }
  return out;
}

export async function importCmsZip(user: SessionUser, zipBuf: Buffer): Promise<ImportReport> {
  if (user.role !== "super_admin") throw new Error("Super Admin role required");

  let entries;
  try {
    entries = unpackZip(zipBuf);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "bad_zip";
    return {
      imported: 0,
      skipped: 1,
      items: [{ titleAr: "", sourceId: "", skipped: "bad_zip", notes: [detail] }],
    };
  }

  const files = new Map(entries.map((e) => [e.name.replace(/\\/g, "/"), e.data]));
  const manifestBuf = files.get("manifest.json");
  if (!manifestBuf) {
    return {
      imported: 0,
      skipped: 1,
      items: [{ titleAr: "", sourceId: "", skipped: "bad_zip", notes: ["manifest.json missing"] }],
    };
  }

  let manifest: CmsZipManifest;
  try {
    manifest = parseManifest(JSON.parse(manifestBuf.toString("utf8")));
  } catch (err) {
    return {
      imported: 0,
      skipped: 1,
      items: [
        {
          titleAr: "",
          sourceId: "",
          skipped: "bad_zip",
          notes: [err instanceof Error ? err.message : "bad_zip"],
        },
      ],
    };
  }

  const users = await query<{ email: string; id: string; is_active: boolean }>(
    `SELECT email, id, is_active FROM users`,
  );
  const authorUsers = users.rows.map((u) => ({
    email: u.email,
    id: u.id,
    isActive: u.is_active,
  }));
  const orgs = await query<{ id: string }>(`SELECT id FROM org_units`);
  const orgSet = new Set(orgs.rows.map((o) => o.id));
  const groups = await query<{ id: string }>(
    `SELECT id FROM content_items WHERE content_type = 'research_group' AND recycled_at IS NULL`,
  );
  const groupSet = new Set(groups.rows.map((g) => g.id));

  const report: ImportReport = { imported: 0, skipped: 0, items: [] };

  for (const raw of manifest.items) {
    const notes: string[] = [];
    if (!raw || typeof raw !== "object") {
      report.skipped += 1;
      report.items.push({ titleAr: "", sourceId: "", skipped: "invalid_item", notes: [] });
      continue;
    }
    if (!isExportableType(raw.content_type) || raw.content_type !== manifest.content_type) {
      report.skipped += 1;
      report.items.push({
        titleAr: raw.title_ar || "",
        sourceId: raw.source_id || "",
        skipped: "wrong_type",
        notes: [],
      });
      continue;
    }
    const titleAr = (raw.title_ar || "").trim();
    if (!titleAr) {
      report.skipped += 1;
      report.items.push({
        titleAr: "",
        sourceId: raw.source_id || "",
        skipped: "invalid_item",
        notes: ["Arabic title is required"],
      });
      continue;
    }

    const author = resolveImportAuthor({
      zipEmail: raw.author_email,
      users: authorUsers,
      saUserId: user.id,
    });
    if (!author.restored) notes.push("author_missing");

    let orgId = raw.org_unit_id?.trim() || "centre_wide";
    if (!orgSet.has(orgId)) {
      orgId = orgSet.has("centre_wide") ? "centre_wide" : [...orgSet][0] || orgId;
      notes.push("org_missing");
    }

    const paths = collectZipMediaPaths(raw);
    const pathMap = new Map<string, string | null>();
    for (const p of paths) {
      pathMap.set(p, await remapMediaPath(user, raw.content_type, p, files, notes));
    }
    const imagePath = raw.image_path ? pathMap.get(raw.image_path) ?? null : null;
    const cardPath = raw.image_card_path ? pathMap.get(raw.image_card_path) ?? null : null;
    const ogPath = raw.og_image ? pathMap.get(raw.og_image) ?? null : null;
    const attachments = remapAttachments(raw.attachments, pathMap);

    let groupId = raw.research_group_id;
    if (groupId && !groupSet.has(groupId)) {
      groupId = null;
      notes.push("research_group_missing");
    }

    const newId = randomUUID();
    const slug = await resolvePublicSlug({
      itemId: newId,
      titleAr,
      existingSlug: null,
    });
    const status = importAlwaysDraft();

    await query(
      `INSERT INTO content_items (
        id, content_type, status, org_unit_id, created_by, updated_by, en_status,
        title_ar, title_en, label_ar, label_en, summary_ar, summary_en, body_ar, body_en,
        image_path, image_card_path, image_alt_ar, image_alt_en, attachments, og_image,
        checklist_confirmed, review_note, public_slug, published_at, live_payload, live_at,
        event_scope, event_day, event_month, event_year, event_type_ar, event_type_en, event_display_status,
        pub_kind, partner_scope, partner_date, partner_emoji,
        alert_link_url, alert_link_label_ar, alert_link_label_en, external_url, platform_kind,
        research_group_id, research_lead_ar, research_lead_en, research_members,
        research_questions_ar, research_questions_en, research_axes,
        research_duration_ar, research_duration_en, research_impacts,
        meta_title_ar, meta_title_en, meta_description_ar, meta_description_en,
        publisher_id, review_owner_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20::jsonb, $21,
        FALSE, NULL, $22, NULL, NULL, NULL,
        $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33,
        $34, $35, $36, $37, $38,
        $39, $40, $41, $42::jsonb,
        $43, $44, $45::jsonb,
        $46, $47, $48::jsonb,
        $49, $50, $51, $52,
        NULL, NULL
      )`,
      [
        newId,
        raw.content_type,
        status,
        orgId,
        author.userId,
        user.id,
        raw.en_status === "ready" ? "ready" : "pending",
        titleAr,
        raw.title_en?.trim() || null,
        raw.label_ar,
        raw.label_en,
        raw.summary_ar,
        raw.summary_en,
        sanitizeBodyHtml(raw.body_ar ?? undefined),
        sanitizeBodyHtml(raw.body_en ?? undefined),
        imagePath,
        cardPath,
        raw.image_alt_ar,
        raw.image_alt_en,
        JSON.stringify(attachments),
        ogPath,
        slug,
        raw.event_scope,
        raw.event_day,
        raw.event_month,
        raw.event_year,
        raw.event_type_ar,
        raw.event_type_en,
        raw.event_display_status,
        raw.pub_kind,
        raw.partner_scope,
        raw.partner_date,
        raw.partner_emoji,
        raw.alert_link_url,
        raw.alert_link_label_ar,
        raw.alert_link_label_en,
        raw.external_url,
        raw.platform_kind,
        groupId,
        raw.research_lead_ar,
        raw.research_lead_en,
        jsonParam(raw.research_members),
        raw.research_questions_ar,
        raw.research_questions_en,
        jsonParam(raw.research_axes),
        raw.research_duration_ar,
        raw.research_duration_en,
        jsonParam(raw.research_impacts),
        raw.meta_title_ar,
        raw.meta_title_en,
        raw.meta_description_ar,
        raw.meta_description_en,
      ],
    );

    report.imported += 1;
    report.items.push({
      titleAr,
      sourceId: raw.source_id,
      newId,
      notes,
    });
  }

  await writeAudit({
    actor: user,
    action: `${manifest.content_type}.import`,
    entityType: manifest.content_type,
    entityId: manifest.content_type,
    summary: `Imported ${report.imported} ${manifest.content_type} draft(s); skipped ${report.skipped}`,
    metadata: { imported: report.imported, skipped: report.skipped },
  });

  return report;
}
