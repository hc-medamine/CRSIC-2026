import { query } from "@/lib/db";

/** Shared OFFSET/LIMIT + hasMore math for CMS news/events/publications lists. */

export const LIST_PAGE_MAX = 100;
export const LIST_LOAD_MORE_SKELETON_ROWS = 4;

export type ListSlice = "window" | "page";

export type ContentListQuery = {
  page?: number | string | null;
  q?: string | null;
  status?: string | null;
  /** `window` = first page×size rows (SSR). `page` = one page (Load more API). */
  slice?: ListSlice;
};

export function listQueryFromSearchParams(sp: {
  get(name: string): string | null;
}): ContentListQuery {
  return {
    page: sp.get("page"),
    q: sp.get("q"),
    status: sp.get("status"),
    slice: "page",
  };
}

export type ContentListResult<T> = {
  items: T[];
  hasMore: boolean;
  page: number;
};

export type ListRoleScope =
  | { kind: "all" }
  | { kind: "orgs"; orgIds: string[] }
  | { kind: "author"; userId: string };

export function parseListPage(raw: number | string | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), LIST_PAGE_MAX);
}

export function normalizeListQuery(opts: ContentListQuery = {}): {
  page: number;
  q: string;
  status: string;
  slice: ListSlice;
} {
  return {
    page: parseListPage(opts.page),
    q: (opts.q ?? "").trim(),
    status: (opts.status ?? "").trim(),
    slice: opts.slice === "page" ? "page" : "window",
  };
}

export function paginationBounds(page: number, pageSize: number, slice: ListSlice) {
  const p = parseListPage(page);
  if (slice === "window") {
    return { page: p, limit: p * pageSize + 1, offset: 0, take: p * pageSize };
  }
  return { page: p, limit: pageSize + 1, offset: (p - 1) * pageSize, take: pageSize };
}

export function trimHasMore<T>(rows: T[], take: number): { items: T[]; hasMore: boolean } {
  return { items: rows.slice(0, take), hasMore: rows.length > take };
}

export function emptyContentList<T>(page: number): ContentListResult<T> {
  return { items: [], hasMore: false, page: parseListPage(page) };
}

export function buildContentListQuery(opts: {
  contentType: string;
  role: ListRoleScope;
  q: string;
  status: string;
  limit: number;
  offset: number;
}): { text: string; params: unknown[] } {
  const params: unknown[] = [opts.contentType];
  const where = ["content_type = $1"];

  if (opts.role.kind === "orgs") {
    params.push(opts.role.orgIds);
    where.push(`org_unit_id = ANY($${params.length}::text[])`);
  } else if (opts.role.kind === "author") {
    params.push(opts.role.userId);
    where.push(`created_by = $${params.length}`);
  }

  if (opts.status) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }

  if (opts.q) {
    params.push(opts.q.toLowerCase());
    const p = `$${params.length}`;
    where.push(`(
      position(${p} in lower(title_ar)) > 0
      OR position(${p} in lower(coalesce(title_en, ''))) > 0
      OR position(${p} in lower(status)) > 0
    )`);
  }

  params.push(opts.limit);
  const limitIdx = params.length;
  params.push(opts.offset);
  const offsetIdx = params.length;

  return {
    text: `SELECT * FROM content_items WHERE ${where.join(" AND ")}
       AND recycled_at IS NULL
       ORDER BY updated_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  };
}

export async function fetchContentListPage<T extends import("pg").QueryResultRow>(opts: {
  contentType: string;
  role: ListRoleScope;
  pageSize: number;
  listQuery?: ContentListQuery;
}): Promise<ContentListResult<T>> {
  const qn = normalizeListQuery(opts.listQuery);
  if (opts.role.kind === "orgs" && opts.role.orgIds.length === 0) {
    return emptyContentList(qn.page);
  }
  const bounds = paginationBounds(qn.page, opts.pageSize, qn.slice);
  const sql = buildContentListQuery({
    contentType: opts.contentType,
    role: opts.role,
    q: qn.q,
    status: qn.status,
    limit: bounds.limit,
    offset: bounds.offset,
  });
  const result = await query<T>(sql.text, sql.params);
  const trimmed = trimHasMore(result.rows, bounds.take);
  return { ...trimmed, page: bounds.page };
}
