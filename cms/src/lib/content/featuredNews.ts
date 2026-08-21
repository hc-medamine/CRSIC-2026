import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import {
  canAccessContentType,
  canReview,
  getUserOrgIds,
} from "@/lib/content/permissions";
import { writePublicFeaturedNewsJson } from "@/lib/publish/featuredNewsJson";
import { isUuid, sanitizePlaylistIds } from "@/lib/content/featuredNewsIds";

export {
  FEATURED_NEWS_MAX,
  isUsingFallback,
  sanitizePlaylistIds,
} from "@/lib/content/featuredNewsIds";

const MISSING_ROW = "Featured news record missing. Run database migrations.";

export type SiteFeaturedNewsRow = {
  id: number;
  draft_ids: string[];
  live_ids: string[];
  updated_by: string | null;
  updated_at: Date;
  published_at: Date | null;
};

export type LiveNewsPick = {
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

function asIdList(ids: string[] | null | undefined): string[] {
  return (ids || []).map((id) => String(id).toLowerCase());
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
    const result = await query<SiteFeaturedNewsRow>(
      `SELECT id, draft_ids, live_ids, updated_by, updated_at, published_at
       FROM site_featured_news WHERE id = 1`,
    );
    return result.rows[0] ?? null;
  } catch (err) {
    if (isUndefinedTable(err)) return null;
    throw err;
  }
}

async function restoreFeaturedNewsRow(row: SiteFeaturedNewsRow): Promise<void> {
  await query(
    `UPDATE site_featured_news SET
       draft_ids = $1::uuid[],
       live_ids = $2::uuid[],
       updated_by = $3,
       updated_at = $4,
       published_at = $5
     WHERE id = 1`,
    [row.draft_ids, row.live_ids, row.updated_by, row.updated_at, row.published_at],
  );
}

/** Live catalog ids in staff order, plus the public news.json id for each. */
async function resolveLiveRefs(
  ids: string[],
): Promise<{ id: string; publicId: string }[]> {
  if (ids.length === 0) return [];
  const result = await query<{ id: string; public_id: string }>(
    `SELECT id::text AS id,
            COALESCE(NULLIF(live_payload->>'id', ''), id::text) AS public_id
     FROM content_items
     WHERE content_type = 'news'
       AND live_payload IS NOT NULL
       AND id = ANY($1::uuid[])`,
    [ids],
  );
  const byId = new Map(result.rows.map((r) => [r.id.toLowerCase(), r.public_id]));
  return ids
    .map((id) => {
      const publicId = byId.get(id.toLowerCase());
      return publicId ? { id: id.toLowerCase(), publicId } : null;
    })
    .filter((row): row is { id: string; publicId: string } => Boolean(row));
}

export async function rebuildPublicFeaturedNewsJson(): Promise<{
  count: number;
  path: string;
}> {
  const row = await getSiteFeaturedNews();
  const refs = await resolveLiveRefs(asIdList(row?.live_ids));
  return writePublicFeaturedNewsJson(refs.map((r) => r.publicId));
}

export async function listLiveNewsForFeatured(
  user: SessionUser,
): Promise<LiveNewsPick[]> {
  if (!(await canAccessFeaturedNews(user))) return [];

  let sql = `SELECT id::text AS id, title_ar, public_slug,
            NULLIF(live_payload->>'slug', '') AS payload_slug,
            LEFT(COALESCE(live_payload->>'date', ''), 10) AS payload_date,
            published_at
     FROM content_items
     WHERE content_type = 'news' AND live_payload IS NOT NULL`;
  const params: unknown[] = [];

  if (user.role === "reviewer") {
    const orgs = await getUserOrgIds(user.id);
    if (orgs.length === 0) return [];
    sql += ` AND org_unit_id = ANY($1::text[])`;
    params.push(orgs);
  }

  sql += ` ORDER BY COALESCE(NULLIF(live_payload->>'date', ''), to_char(published_at, 'YYYY-MM-DD')) DESC NULLS LAST`;

  const result = await query<{
    id: string;
    title_ar: string;
    public_slug: string | null;
    payload_slug: string | null;
    payload_date: string | null;
    published_at: Date | null;
  }>(sql, params);

  return result.rows.map((row) => ({
    id: row.id,
    titleAr: row.title_ar,
    slug: row.payload_slug || row.public_slug || row.id,
    date: String(row.payload_date || "").slice(0, 10),
  }));
}

export async function saveFeaturedNewsDraft(
  user: SessionUser,
  ids: unknown,
): Promise<SiteFeaturedNewsRow> {
  if (!(await canAccessFeaturedNews(user))) {
    throw new Error("No permission to edit featured news");
  }
  const sanitized = sanitizePlaylistIds(ids);
  const draftIds = (await resolveLiveRefs(sanitized)).map((r) => r.id);

  try {
    const result = await query<SiteFeaturedNewsRow>(
      `INSERT INTO site_featured_news (id, draft_ids, updated_by, updated_at)
       VALUES (1, $1::uuid[], $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         draft_ids = EXCLUDED.draft_ids,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, draft_ids, live_ids, updated_by, updated_at, published_at`,
      [draftIds, user.id],
    );
    const row = result.rows[0];
    if (!row) throw new Error(MISSING_ROW);
    await writeAudit({
      actor: user,
      action: "featured_news.save",
      entityType: "site_featured_news",
      entityId: "1",
      summary: `Saved featured news draft (${draftIds.length} items)`,
    });
    return row;
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
  const liveIds = (await resolveLiveRefs(asIdList(existing.draft_ids))).map((r) => r.id);

  let row: SiteFeaturedNewsRow;
  try {
    const result = await query<SiteFeaturedNewsRow>(
      `UPDATE site_featured_news SET
         live_ids = $1::uuid[],
         draft_ids = $1::uuid[],
         published_at = NOW(),
         updated_by = $2,
         updated_at = NOW()
       WHERE id = 1
       RETURNING id, draft_ids, live_ids, updated_by, updated_at, published_at`,
      [liveIds, user.id],
    );
    row = result.rows[0];
    if (!row) throw new Error(MISSING_ROW);
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
    summary: `Published featured news playlist (${liveIds.length} items)`,
  });
  return row;
}

/** Drop an unpublished/deleted news id from draft and live; rebuild if live changed. */
export async function pruneFeaturedNewsItem(newsId: string): Promise<void> {
  const id = String(newsId || "").trim().toLowerCase();
  if (!isUuid(id)) return;

  const before = await getSiteFeaturedNews();
  if (!before) return;

  const liveHad = asIdList(before.live_ids).includes(id);
  try {
    await query(
      `UPDATE site_featured_news SET
         draft_ids = array_remove(draft_ids, $1::uuid),
         live_ids = array_remove(live_ids, $1::uuid),
         updated_at = NOW()
       WHERE id = 1`,
      [id],
    );
    if (liveHad) {
      await rebuildPublicFeaturedNewsJson();
    }
  } catch (err) {
    if (isUndefinedTable(err)) return;
    await restoreFeaturedNewsRow(before);
    throw err;
  }
}
