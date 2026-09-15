-- Home featured playlist: typed news|event entries (PRD 2026-09-15).
-- Keep draft_ids / live_ids in sync as news-only UUID[] for legacy readers.

ALTER TABLE site_featured_news
  ADD COLUMN IF NOT EXISTS draft_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS live_items JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE site_featured_news
SET
  draft_items = COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('type', 'news', 'id', lower(x::text))
        ORDER BY ord
      )
      FROM unnest(draft_ids) WITH ORDINALITY AS u(x, ord)
    ),
    '[]'::jsonb
  ),
  live_items = COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('type', 'news', 'id', lower(x::text))
        ORDER BY ord
      )
      FROM unnest(live_ids) WITH ORDINALITY AS u(x, ord)
    ),
    '[]'::jsonb
  )
WHERE (draft_items = '[]'::jsonb AND cardinality(draft_ids) > 0)
   OR (live_items = '[]'::jsonb AND cardinality(live_ids) > 0);
