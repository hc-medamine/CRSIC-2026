-- Item-level comment threads (Phase 2 #1). Append-only; no edit/delete.

CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users (id),
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general'
    CHECK (kind IN ('general', 'changes_requested', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_comments_item_created_idx
  ON content_comments (content_item_id, created_at ASC);

COMMENT ON TABLE content_comments IS
  'Append-only item-level review conversation (Phase 2 #1).';

-- Backfill latest review_note into the thread once (kind inferred from status).
INSERT INTO content_comments (content_item_id, author_id, body, kind, created_at)
SELECT
  c.id,
  COALESCE(c.updated_by, c.created_by),
  c.review_note,
  CASE
    WHEN c.status = 'rejected' THEN 'rejected'
    WHEN c.status = 'changes_requested' THEN 'changes_requested'
    ELSE 'general'
  END,
  c.updated_at
FROM content_items c
WHERE c.review_note IS NOT NULL
  AND TRIM(c.review_note) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM content_comments cc WHERE cc.content_item_id = c.id
  );
