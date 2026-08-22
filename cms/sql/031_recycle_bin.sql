-- Soft-delete recycle bin (PRD 2026-08-22-cms-recycle-bin).

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS recycled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recycled_by UUID REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recycled_from_status TEXT;

CREATE INDEX IF NOT EXISTS content_items_recycled_at_idx
  ON content_items (recycled_at)
  WHERE recycled_at IS NOT NULL;

COMMENT ON COLUMN content_items.recycled_at IS
  'Set when Super Admin moves an unpublished/rejected item to the Recycle bin. NULL = visible in normal lists.';
