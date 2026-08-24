import type { CmsLang } from "@/lib/i18n/labels";

export type SortDir = "asc" | "desc";
export type SortKind = "text" | "status" | "enStatus" | "date" | "number";
export type HeaderSort = { key: string; dir: SortDir };

export const CONTENT_LIST_SORT_KEYS = ["title", "status", "en", "updated"] as const;
export type ContentListSortKey = (typeof CONTENT_LIST_SORT_KEYS)[number];

export const CONTENT_STATUS_ORDER = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "published",
  "unpublished",
  "rejected",
] as const;

export const EN_STATUS_ORDER = ["pending", "ready"] as const;

const STATUS_RANK = new Map<string, number>(CONTENT_STATUS_ORDER.map((s, i) => [s, i]));
const EN_RANK = new Map<string, number>(EN_STATUS_ORDER.map((s, i) => [s, i]));

export function naturalDir(kind: SortKind): SortDir {
  return kind === "date" || kind === "number" ? "desc" : "asc";
}

export function contentListSortKind(key: ContentListSortKey): SortKind {
  if (key === "status") return "status";
  if (key === "en") return "enStatus";
  if (key === "updated") return "date";
  return "text";
}

export function toggleHeaderSort(
  current: HeaderSort | null,
  key: string,
  kind: SortKind,
  firstDir?: SortDir,
): HeaderSort {
  if (!current || current.key !== key) return { key, dir: firstDir ?? naturalDir(kind) };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

export function parseContentListSort(
  rawKey: string | null | undefined,
  rawDir: string | null | undefined,
): HeaderSort | null {
  const key = CONTENT_LIST_SORT_KEYS.find((k) => k === rawKey);
  if (!key) return null;
  const kind = contentListSortKind(key);
  const dir = rawDir === "asc" || rawDir === "desc" ? rawDir : naturalDir(kind);
  return { key, dir };
}

export function compareText(a: string, b: string, lang: CmsLang): number {
  return a.localeCompare(b, lang === "ar" ? "ar" : "en", { sensitivity: "base", numeric: true });
}

export function statusRank(status: string): number {
  return STATUS_RANK.get(status) ?? 99;
}

export function enStatusRank(status: string): number {
  return EN_RANK.get(status) ?? 99;
}

function toTime(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function compareValues(
  kind: SortKind,
  a: string | number,
  b: string | number,
  lang: CmsLang,
): number {
  if (kind === "status") return statusRank(String(a)) - statusRank(String(b));
  if (kind === "enStatus") return enStatusRank(String(a)) - enStatusRank(String(b));
  if (kind === "date") return toTime(a) - toTime(b);
  if (kind === "number") return Number(a) - Number(b);
  return compareText(String(a), String(b), lang);
}

export function sortRows<T>(
  rows: readonly T[],
  sort: HeaderSort | null,
  getValue: (row: T, key: string) => string | number,
  kindFor: (key: string) => SortKind,
  lang: CmsLang,
): T[] {
  if (!sort) return [...rows];
  const kind = kindFor(sort.key);
  const mul = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const cmp = compareValues(kind, getValue(left, sort.key), getValue(right, sort.key), lang);
    if (cmp !== 0) return cmp * mul;
    return 0;
  });
}

const STATUS_SQL = CONTENT_STATUS_ORDER.map((s, i) => `WHEN '${s}' THEN ${i + 1}`).join(" ");

/** Whitelisted ORDER BY for paged content lists. Never interpolate raw user strings. */
export function contentListSqlOrderBy(sort: HeaderSort | null): string {
  if (!sort || !CONTENT_LIST_SORT_KEYS.includes(sort.key as ContentListSortKey)) {
    return "ORDER BY updated_at DESC, id ASC";
  }
  const dir = sort.dir === "asc" ? "ASC" : "DESC";
  switch (sort.key) {
    case "title":
      return `ORDER BY title_ar ${dir} NULLS LAST, id ASC`;
    case "status":
      return `ORDER BY CASE status ${STATUS_SQL} ELSE 99 END ${dir}, updated_at DESC, id ASC`;
    case "en":
      return `ORDER BY CASE COALESCE(en_status, '') WHEN 'pending' THEN 1 WHEN 'ready' THEN 2 ELSE 3 END ${dir}, id ASC`;
    case "updated":
      return `ORDER BY updated_at ${dir} NULLS LAST, id ASC`;
    default:
      return "ORDER BY updated_at DESC, id ASC";
  }
}

export function ariaSortValue(sort: HeaderSort | null, key: string): "none" | "ascending" | "descending" {
  if (!sort || sort.key !== key) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}
