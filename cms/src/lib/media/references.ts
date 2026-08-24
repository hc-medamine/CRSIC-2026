import { query } from "@/lib/db";
import { contentPathSegment, type ContentType } from "@/lib/content/lifecycle";

export type MediaReferenceSource =
  | "image_path"
  | "image_card_path"
  | "og_image"
  | "attachments"
  | "live_payload"
  | "revision";

export type MediaReference = {
  contentItemId: string;
  contentType: string;
  titleAr: string;
  status: string;
  source: MediaReferenceSource;
  revisionId?: string;
  revisionNumber?: number;
  dashboardPath: string;
};

type RefRow = {
  content_item_id: string;
  content_type: string;
  title_ar: string;
  status: string;
  source: MediaReferenceSource;
  revision_id: string | null;
  revision_number: number | null;
};

function toReference(row: RefRow): MediaReference {
  const ref: MediaReference = {
    contentItemId: row.content_item_id,
    contentType: row.content_type,
    titleAr: row.title_ar,
    status: row.status,
    source: row.source,
    dashboardPath: `/dashboard/${contentPathSegment(row.content_type as ContentType)}/${row.content_item_id}`,
  };
  if (row.revision_id) {
    ref.revisionId = row.revision_id;
    ref.revisionNumber = row.revision_number ?? undefined;
  }
  return ref;
}

/**
 * On-demand scan of durable media references for a CMS public_path.
 * Ignores preview_tokens (ephemeral). Revisions block delete (design D2=A).
 */
function isTrackableMediaPath(publicPath: string): boolean {
  return publicPath.startsWith("img/cms/") || publicPath.startsWith("img/covers/");
}

export async function listMediaReferences(publicPath: string): Promise<MediaReference[]> {
  if (!isTrackableMediaPath(publicPath)) return [];
  const byPath = await listMediaReferencesForPaths([publicPath]);
  return byPath.get(publicPath) ?? [];
}

/**
 * Batch scan of durable media references for many CMS public_paths.
 * Used by the media library cards (article title) without N+1 queries.
 */
export async function listMediaReferencesForPaths(
  publicPaths: string[],
): Promise<Map<string, MediaReference[]>> {
  const paths = [...new Set(publicPaths.filter((p) => isTrackableMediaPath(p)))];
  const out = new Map<string, MediaReference[]>();
  for (const p of paths) out.set(p, []);
  if (paths.length === 0) return out;

  const result = await query<RefRow & { public_path: string }>(
    `
    WITH path AS (SELECT unnest($1::text[]) AS p)
    SELECT path.p AS public_path,
           refs.content_item_id, refs.content_type, refs.title_ar, refs.status,
           refs.source, refs.revision_id, refs.revision_number
    FROM (
      SELECT ci.id AS content_item_id, ci.content_type, ci.title_ar, ci.status,
             'image_path'::text AS source,
             NULL::uuid AS revision_id, NULL::int AS revision_number,
             ci.image_path AS match_path
      FROM content_items ci
      WHERE ci.image_path = ANY($1::text[])

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'image_card_path', NULL, NULL, ci.image_card_path
      FROM content_items ci
      WHERE ci.image_card_path = ANY($1::text[])

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'og_image', NULL, NULL, ci.og_image
      FROM content_items ci
      WHERE ci.og_image = ANY($1::text[])

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'attachments', NULL, NULL, elem->>'src'
      FROM content_items ci
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ci.attachments, '[]'::jsonb)) elem
      WHERE elem->>'src' = ANY($1::text[])

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'live_payload', NULL, NULL, path.p
      FROM content_items ci
      CROSS JOIN path
      WHERE ci.live_payload IS NOT NULL
        AND (
          ci.live_payload->>'img' = path.p
          OR ci.live_payload->>'cover' = path.p
          OR ci.live_payload->>'img_card' = path.p
          OR ci.live_payload->>'og_image' = path.p
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(ci.live_payload->'media', '[]'::jsonb)) m
            WHERE m->>'src' = path.p
          )
        )

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'revision', r.id, r.revision_number, path.p
      FROM content_revisions r
      JOIN content_items ci ON ci.id = r.content_item_id
      CROSS JOIN path
      WHERE r.snapshot->>'image_path' = path.p
         OR r.snapshot->>'image_card_path' = path.p
         OR r.snapshot->>'og_image' = path.p
         OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(r.snapshot->'attachments', '[]'::jsonb)) elem
           WHERE elem->>'src' = path.p
         )
    ) refs
    JOIN path ON path.p = refs.match_path
    ORDER BY public_path, content_type, title_ar, source, revision_number NULLS FIRST
    `,
    [paths],
  );

  const seen = new Set<string>();
  for (const row of result.rows) {
    const key = `${row.public_path}|${row.content_item_id}|${row.source}|${row.revision_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = out.get(row.public_path) ?? [];
    list.push(toReference(row));
    out.set(row.public_path, list);
  }
  return out;
}

export async function isMediaReferenced(publicPath: string): Promise<boolean> {
  const refs = await listMediaReferences(publicPath);
  return refs.length > 0;
}

export { mediaReplaceAffectsPublic } from "./replacePublic";
