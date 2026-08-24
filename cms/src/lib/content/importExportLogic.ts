import { ALL_CONTENT_TYPES, type ContentType } from "@/lib/content-types";

export const CMS_ZIP_FORMAT = "crsic-cms-item-zip";
export const CMS_ZIP_VERSION = 1;
export const EXPORT_COUNT_WARN = 200;
export const EXPORT_PAGE_SIZE = 20;
export const EXPORT_NONE_REMAINING = "None of the selected items can be exported";
export const EXPORT_SELECT_REQUIRED = "Select at least one item";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CmsZipManifest = {
  format: typeof CMS_ZIP_FORMAT;
  version: number;
  exported_at: string;
  content_type: ContentType;
  items: CmsZipItem[];
};

export type CmsZipItem = {
  source_id: string;
  content_type: ContentType;
  author_email: string | null;
  org_unit_id: string;
  en_status: string;
  title_ar: string;
  title_en: string | null;
  label_ar: string | null;
  label_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  image_path: string | null;
  image_card_path: string | null;
  image_alt_ar: string | null;
  image_alt_en: string | null;
  attachments: unknown;
  og_image: string | null;
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

export type ImportSkipReason =
  | "unknown_type"
  | "bad_zip"
  | "invalid_item"
  | "wrong_type";

export type ImportReportItem = {
  titleAr: string;
  sourceId: string;
  newId?: string;
  skipped?: ImportSkipReason;
  notes: string[];
};

export type ImportReport = {
  imported: number;
  skipped: number;
  items: ImportReportItem[];
};

export type ExportPickerRow = {
  id: string;
  titleAr: string;
  status: string;
  updatedAt: string;
};

/** Unique UUID strings in request order. Does not cap at 200. */
export function uniqueExportIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const id = value.trim().toLowerCase();
    if (!id || !UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function remainingExportIds(
  requested: readonly string[],
  exportableIds: readonly string[],
): string[] {
  const ok = new Set(exportableIds.map((id) => id.toLowerCase()));
  return uniqueExportIds([...requested]).filter((id) => ok.has(id));
}

export function selectedExportError(remainingCount: number): string | null {
  if (remainingCount < 1) return EXPORT_NONE_REMAINING;
  return null;
}

export function shouldWarnLargeExport(n: number): boolean {
  return n > EXPORT_COUNT_WARN;
}

/** Header checkbox touches loaded rows only; other selected ids stay. */
export function applyHeaderCheckbox(
  loadedIds: readonly string[],
  selected: ReadonlySet<string>,
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  if (checked) {
    for (const id of loadedIds) next.add(id);
  } else {
    for (const id of loadedIds) next.delete(id);
  }
  return next;
}

export function headerCheckboxState(
  loadedIds: readonly string[],
  selected: ReadonlySet<string>,
): { checked: boolean; indeterminate: boolean } {
  if (loadedIds.length === 0) return { checked: false, indeterminate: false };
  let n = 0;
  for (const id of loadedIds) {
    if (selected.has(id)) n += 1;
  }
  return {
    checked: n === loadedIds.length,
    indeterminate: n > 0 && n < loadedIds.length,
  };
}

export function isExportableType(value: string): value is ContentType {
  return (ALL_CONTENT_TYPES as string[]).includes(value);
}

export function shouldExportRow(recycledAt: Date | string | null | undefined): boolean {
  return recycledAt == null;
}

export function importAlwaysDraft(): "draft" {
  return "draft";
}

export function resolveImportAuthor(opts: {
  zipEmail: string | null | undefined;
  users: { email: string; id: string; isActive: boolean }[];
  saUserId: string;
}): { userId: string; restored: boolean } {
  const email = opts.zipEmail?.trim().toLowerCase();
  if (!email) return { userId: opts.saUserId, restored: false };
  const match = opts.users.find((u) => u.isActive && u.email.trim().toLowerCase() === email);
  if (!match) return { userId: opts.saUserId, restored: false };
  return { userId: match.id, restored: true };
}

export function collectZipMediaPaths(item: {
  image_path?: string | null;
  image_card_path?: string | null;
  og_image?: string | null;
  attachments?: unknown;
}): string[] {
  const out = new Set<string>();
  for (const p of [item.image_path, item.image_card_path, item.og_image]) {
    if (p && typeof p === "string" && p.startsWith("img/")) out.add(p);
  }
  if (Array.isArray(item.attachments)) {
    for (const entry of item.attachments) {
      if (!entry || typeof entry !== "object") continue;
      const src = (entry as { src?: unknown }).src;
      if (typeof src === "string" && src.startsWith("img/")) out.add(src);
    }
  }
  return [...out];
}

export function zipFileNameForPath(publicPath: string): string {
  return `files/${publicPath.replace(/^img\//, "")}`;
}

export function parseManifest(raw: unknown): CmsZipManifest {
  if (!raw || typeof raw !== "object") throw new Error("Zip is missing manifest.json");
  const m = raw as Partial<CmsZipManifest>;
  if (m.format !== CMS_ZIP_FORMAT) throw new Error("This file is not a CRSIC Desk export");
  if (m.version !== CMS_ZIP_VERSION) throw new Error("This export version is not supported");
  if (!m.content_type || !isExportableType(m.content_type)) throw new Error("Unknown content type");
  if (!Array.isArray(m.items)) throw new Error("Zip is missing items");
  return {
    format: CMS_ZIP_FORMAT,
    version: CMS_ZIP_VERSION,
    exported_at: typeof m.exported_at === "string" ? m.exported_at : new Date().toISOString(),
    content_type: m.content_type,
    items: m.items as CmsZipItem[],
  };
}

export function bucketForContentType(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  if (type === "publication") return "covers";
  if (type === "partner") return "partners";
  if (type === "alert") return "alerts";
  if (type === "law") return "laws";
  if (type === "platform") return "platforms";
  return "research";
}
