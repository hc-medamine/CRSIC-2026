import { query } from "@/lib/db";
import { contentPathSegment, type ContentType } from "@/lib/content/lifecycle";

export type MediaReferenceSource =
  | "image_path"
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
export async function listMediaReferences(publicPath: string): Promise<MediaReference[]> {
  if (!publicPath.startsWith("img/cms/")) return [];

  const result = await query<RefRow>(
    `
    WITH path AS (SELECT $1::text AS p)
    SELECT * FROM (
      SELECT ci.id AS content_item_id, ci.content_type, ci.title_ar, ci.status,
             'image_path'::text AS source,
             NULL::uuid AS revision_id, NULL::int AS revision_number
      FROM content_items ci, path
      WHERE ci.image_path = path.p

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'og_image', NULL, NULL
      FROM content_items ci, path
      WHERE ci.og_image = path.p

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'attachments', NULL, NULL
      FROM content_items ci, path
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(ci.attachments, '[]'::jsonb)) elem
        WHERE elem->>'src' = path.p
      )

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'live_payload', NULL, NULL
      FROM content_items ci, path
      WHERE ci.live_payload IS NOT NULL
        AND (
          ci.live_payload->>'img' = path.p
          OR ci.live_payload->>'cover' = path.p
          OR ci.live_payload->>'og_image' = path.p
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(ci.live_payload->'media', '[]'::jsonb)) m
            WHERE m->>'src' = path.p
          )
        )

      UNION ALL
      SELECT ci.id, ci.content_type, ci.title_ar, ci.status,
             'revision', r.id, r.revision_number
      FROM content_revisions r
      JOIN content_items ci ON ci.id = r.content_item_id
      , path
      WHERE r.snapshot->>'image_path' = path.p
         OR r.snapshot->>'og_image' = path.p
         OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(r.snapshot->'attachments', '[]'::jsonb)) elem
           WHERE elem->>'src' = path.p
         )
    ) refs
    ORDER BY content_type, title_ar, source, revision_number NULLS FIRST
    `,
    [publicPath],
  );

  const seen = new Set<string>();
  const out: MediaReference[] = [];
  for (const row of result.rows) {
    const key = `${row.content_item_id}|${row.source}|${row.revision_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toReference(row));
  }
  return out;
}

export async function isMediaReferenced(publicPath: string): Promise<boolean> {
  const refs = await listMediaReferences(publicPath);
  return refs.length > 0;
}
