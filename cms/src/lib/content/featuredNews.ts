import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import {
  canAccessContentType,
  canReview,
  getUserOrgIds,
} from "@/lib/content/permissions";
import { writePublicFeaturedNewsJson } from "@/lib/publish/featuredNewsJson";
import {
  type FeaturedContentType,
  type FeaturedPlaylistEntry,
  isUuid,
  newsIdsFromEntries,
  parseItemsColumn,
  sanitizePlaylistEntries,
} from "@/lib/content/featuredNewsIds";

export {
  FEATURED_NEWS_MAX,
  isUsingFallback,
  sanitizePlaylistEntries,
  sanitizePlaylistIds,
} from "@/lib/content/featuredNewsIds";
export type { FeaturedContentType, FeaturedPlaylistEntry } from "@/lib/content/featuredNewsIds";

const MISSING_ROW = "Featured news record missing. Run database migrations.";

type FeaturedNewsDbRow = {
  id: number;
  draft_ids: string[];
  live_ids: string[];
  draft_items: unknown;
  live_items: unknown;
  updated_by: string | null;
  updated_at: Date;
  published_at: Date | null;
};

export type SiteFeaturedNewsRow = {
  id: number;
  draft_ids: string[];
  live_ids: string[];
  draft_items: FeaturedPlaylistEntry[];
  live_items: FeaturedPlaylistEntry[];
  updated_by: string | null;
  updated_at: Date;
  published_at: Date | null;
};

export type LiveFeaturedPick = {
  type: FeaturedContentType;
  id: string;
  titleAr: string;
  slug: string;
  date: string;
};

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "42P01",
  );
}

function isUndefinedColumn(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "42703",
  );
}

function asIdList(ids: string[] | null | undefined): string[] {
  return (ids || []).map((id) => String(id).toLowerCase());
}

function mapRow(row: FeaturedNewsDbRow): SiteFeaturedNewsRow {
  let draft_items = parseItemsColumn(row.draft_items);
  let live_items = parseItemsColumn(row.live_items);
  if (draft_items.length === 0 && (row.draft_ids || []).length) {
    draft_items = asIdList(row.draft_ids).map((id) => ({ type: "news" as const, id }));
  }
  if (live_items.length === 0 && (row.live_ids || []).length) {
    live_items = asIdList(row.live_ids).map((id) => ({ type: "news" as const, id }));
  }
  return {
    id: row.id,
    draft_ids: newsIdsFromEntries(draft_items),
    live_ids: newsIdsFromEntries(live_items),
    draft_items,
    live_items,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    published_at: row.published_at,
  };
}

/** News Editor, Reviewer with news in catalog, or Super Admin. */
export async function canAccessFeaturedNews(user: SessionUser): Promise<boolean> {
  return canAccessContentType(user, "news");
}

export function canPublishFeaturedNews(user: SessionUser): boolean {
  return canReview(user);
}

export async function getSiteFeaturedNews(): Promise<SiteFeaturedNewsRow | null> {
  try {
    const result = await query<FeaturedNewsDbRow>(
      `SELECT id, draft_ids, live_ids, draft_items, live_items,
              updated_by, updated_at, published_at
       FROM site_featured_news WHERE id = 1`,
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  } catch (err) {
    if (isUndefinedTable(err)) return null;
    if (isUndefinedColumn(err)) {
      const legacy = await query<{
        id: number;
        draft_ids: string[];
        live_ids: string[];
        updated_by: string | null;
        updated_at: Date;
        published_at: Date | null;
      }>(
        `SELECT id, draft_ids, live_ids, updated_by, updated_at, published_at
         FROM site_featured_news WHERE id = 1`,
      );
      const row = legacy.rows[0];
      if (!row) return null;
      return mapRow({
        ...row,
        draft_items: [],
        live_items: [],
      });
    }
    throw err;
  }
}

async function restoreFeaturedNewsRow(row: SiteFeaturedNewsRow): Promise<void> {
  await query(
    `UPDATE site_featured_news SET
       draft_ids = $1::uuid[],
       live_ids = $2::uuid[],
       draft_items = $3::jsonb,
       live_items = $4::jsonb,
       updated_by = $5,
       updated_at = $6,
       published_at = $7
     WHERE id = 1`,
    [
      row.draft_ids,
      row.live_ids,
      JSON.stringify(row.draft_items),
      JSON.stringify(row.live_items),
      row.updated_by,
      row.updated_at,
      row.published_at,
    ],
  );
}

async function resolveLiveEntries(
  entries: FeaturedPlaylistEntry[],
): Promise<{ type: FeaturedContentType; id: string; publicId: string }[]> {
  if (entries.length === 0) return [];
  const newsIds = entries.filter((e) => e.type === "news").map((e) => e.id);
  const eventIds = entries.filter((e) => e.type === "event").map((e) => e.id);

  const byKey = new Map<string, string>();

  if (newsIds.length) {
    const result = await query<{ id: string; public_id: string }>(
      `SELECT id::text AS id,
              COALESCE(NULLIF(live_payload->>'id', ''), id::text) AS public_id
       FROM content_items
       WHERE content_type = 'news'
         AND live_payload IS NOT NULL
         AND recycled_at IS NULL
         AND id = ANY($1::uuid[])`,
      [newsIds],
    );
    for (const r of result.rows) {
      byKey.set(`news:${r.id.toLowerCase()}`, r.public_id);
    }
  }

  if (eventIds.length) {
    const result = await query<{ id: string; public_id: string }>(
      `SELECT id::text AS id,
              COALESCE(NULLIF(live_payload->>'id', ''), id::text) AS public_id
       FROM content_items
       WHERE content_type = 'event'
         AND live_payload IS NOT NULL
         AND recycled_at IS NULL
         AND id = ANY($1::uuid[])`,
      [eventIds],
    );
    for (const r of result.rows) {
      byKey.set(`event:${r.id.toLowerCase()}`, r.public_id);
    }
  }

  return entries
    .map((e) => {
      const publicId = byKey.get(`${e.type}:${e.id}`);
      return publicId ? { type: e.type, id: e.id, publicId } : null;
    })
    .filter(
      (row): row is { type: FeaturedContentType; id: string; publicId: string } =>
        Boolean(row),
    );
}

export async function rebuildPublicFeaturedNewsJson(): Promise<{
  count: number;
  path: string;
}> {
  const row = await getSiteFeaturedNews();
  const refs = await resolveLiveEntries(row?.live_items || []);
  return writePublicFeaturedNewsJson(
    refs.map((r) => ({ type: r.type, id: r.publicId })),
  );
}

async function listLivePicks(
  user: SessionUser,
  contentType: FeaturedContentType,
): Promise<LiveFeaturedPick[]> {
  if (!(await canAccessFeaturedNews(user))) return [];

  let sql = `SELECT id::text AS id, title_ar, public_slug,
            NULLIF(live_payload->>'slug', '') AS payload_slug,
            LEFT(COALESCE(live_payload->>'date', ''), 10) AS payload_date,
            NULLIF(live_payload->>'day', '') AS payload_day,
            NULLIF(live_payload->>'month', '') AS payload_month,
            NULLIF(live_payload->>'year', '') AS payload_year,
            published_at
     FROM content_items
     WHERE content_type = $1 AND live_payload IS NOT NULL AND recycled_at IS NULL`;
  const params: unknown[] = [contentType];

  if (user.role === "reviewer") {
    const orgs = await getUserOrgIds(user.id);
    if (orgs.length === 0) return [];
    sql += ` AND org_unit_id = ANY($2::text[])`;
    params.push(orgs);
  }

  if (contentType === "news") {
    sql += ` ORDER BY COALESCE(NULLIF(live_payload->>'date', ''), to_char(published_at, 'YYYY-MM-DD')) DESC NULLS LAST`;
  } else {
    sql += ` ORDER BY COALESCE(NULLIF(live_payload->>'year', ''), '0') DESC,
                      COALESCE(NULLIF(live_payload->>'day', ''), '0') DESC,
                      published_at DESC NULLS LAST`;
  }

  const result = await query<{
    id: string;
    title_ar: string;
    public_slug: string | null;
    payload_slug: string | null;
    payload_date: string | null;
    payload_day: string | null;
    payload_month: string | null;
    payload_year: string | null;
    published_at: Date | null;
  }>(sql, params);

  return result.rows.map((row) => {
    const date =
      contentType === "news"
        ? String(row.payload_date || "").slice(0, 10)
        : [row.payload_day, row.payload_month, row.payload_year].filter(Boolean).join(" ");
    return {
      type: contentType,
      id: row.id,
      titleAr: row.title_ar,
      slug: row.payload_slug || row.public_slug || row.id,
      date,
    };
  });
}

export async function listLiveNewsForFeatured(
  user: SessionUser,
): Promise<LiveFeaturedPick[]> {
  return listLivePicks(user, "news");
}

export async function listLiveEventsForFeatured(
  user: SessionUser,
): Promise<LiveFeaturedPick[]> {
  return listLivePicks(user, "event");
}

/** @deprecated Prefer typed picks — news-only list. */
export type LiveNewsPick = LiveFeaturedPick;

export async function saveFeaturedNewsDraft(
  user: SessionUser,
  raw: unknown,
): Promise<SiteFeaturedNewsRow> {
  if (!(await canAccessFeaturedNews(user))) {
    throw new Error("No permission to edit featured news");
  }
  const sanitized = sanitizePlaylistEntries(raw);
  const resolved = await resolveLiveEntries(sanitized);
  const draft_items = resolved.map((r) => ({ type: r.type, id: r.id }));
  const draft_ids = newsIdsFromEntries(draft_items);

  try {
    const result = await query<FeaturedNewsDbRow>(
      `INSERT INTO site_featured_news (id, draft_ids, draft_items, updated_by, updated_at)
       VALUES (1, $1::uuid[], $2::jsonb, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET
         draft_ids = EXCLUDED.draft_ids,
         draft_items = EXCLUDED.draft_items,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, draft_ids, live_ids, draft_items, live_items,
                 updated_by, updated_at, published_at`,
      [draft_ids, JSON.stringify(draft_items), user.id],
    );
    const row = result.rows[0];
    if (!row) throw new Error(MISSING_ROW);
    await writeAudit({
      actor: user,
      action: "featured_news.save",
      entityType: "site_featured_news",
      entityId: "1",
      summary: `Saved featured playlist draft (${draft_items.length} items)`,
    });
    return mapRow(row);
  } catch (err) {
    if (isUndefinedTable(err)) throw new Error(MISSING_ROW);
    throw err;
  }
}

export async function publishFeaturedNews(user: SessionUser): Promise<SiteFeaturedNewsRow> {
  if (!(await canAccessFeaturedNews(user))) {
    throw new Error("No permission to edit featured news");
  }
  if (!canPublishFeaturedNews(user)) {
    throw new Error("Only a Reviewer or Super Admin can publish the featured playlist");
  }

  const existing = await getSiteFeaturedNews();
  if (!existing) throw new Error(MISSING_ROW);
  const resolved = await resolveLiveEntries(existing.draft_items);
  const live_items = resolved.map((r) => ({ type: r.type, id: r.id }));
  const live_ids = newsIdsFromEntries(live_items);

  let row: SiteFeaturedNewsRow;
  try {
    const result = await query<FeaturedNewsDbRow>(
      `UPDATE site_featured_news SET
         live_ids = $1::uuid[],
         draft_ids = $1::uuid[],
         live_items = $2::jsonb,
         draft_items = $2::jsonb,
         published_at = NOW(),
         updated_by = $3,
         updated_at = NOW()
       WHERE id = 1
       RETURNING id, draft_ids, live_ids, draft_items, live_items,
                 updated_by, updated_at, published_at`,
      [live_ids, JSON.stringify(live_items), user.id],
    );
    const dbRow = result.rows[0];
    if (!dbRow) throw new Error(MISSING_ROW);
    row = mapRow(dbRow);
    await rebuildPublicFeaturedNewsJson();
  } catch (err) {
    if (isUndefinedTable(err)) throw new Error(MISSING_ROW);
    await restoreFeaturedNewsRow(existing);
    throw err;
  }

  await writeAudit({
    actor: user,
    action: "featured_news.publish",
    entityType: "site_featured_news",
    entityId: "1",
    summary: `Published featured playlist (${live_items.length} items)`,
  });
  return row;
}

/** Drop an unpublished/deleted item from draft and live; rebuild if live changed. */
export async function pruneFeaturedItem(
  contentType: FeaturedContentType | string,
  itemId: string,
): Promise<void> {
  const type = String(contentType || "").trim().toLowerCase();
  const id = String(itemId || "").trim().toLowerCase();
  if ((type !== "news" && type !== "event") || !isUuid(id)) return;

  const before = await getSiteFeaturedNews();
  if (!before) return;

  const liveHad = before.live_items.some((e) => e.type === type && e.id === id);
  const draft_items = before.draft_items.filter((e) => !(e.type === type && e.id === id));
  const live_items = before.live_items.filter((e) => !(e.type === type && e.id === id));
  const draft_ids = newsIdsFromEntries(draft_items);
  const live_ids = newsIdsFromEntries(live_items);

  try {
    await query(
      `UPDATE site_featured_news SET
         draft_ids = $1::uuid[],
         live_ids = $2::uuid[],
         draft_items = $3::jsonb,
         live_items = $4::jsonb,
         updated_at = NOW()
       WHERE id = 1`,
      [draft_ids, live_ids, JSON.stringify(draft_items), JSON.stringify(live_items)],
    );
    if (liveHad) {
      await rebuildPublicFeaturedNewsJson();
    }
  } catch (err) {
    if (isUndefinedTable(err) || isUndefinedColumn(err)) {
      // Pre-migration: news-only array prune
      if (type === "news") {
        await query(
          `UPDATE site_featured_news SET
             draft_ids = array_remove(draft_ids, $1::uuid),
             live_ids = array_remove(live_ids, $1::uuid),
             updated_at = NOW()
           WHERE id = 1`,
          [id],
        );
        if (liveHad) await rebuildPublicFeaturedNewsJson();
      }
      return;
    }
    await restoreFeaturedNewsRow(before);
    throw err;
  }
}

/** @deprecated Use pruneFeaturedItem("news", id) */
export async function pruneFeaturedNewsItem(newsId: string): Promise<void> {
  await pruneFeaturedItem("news", newsId);
}
