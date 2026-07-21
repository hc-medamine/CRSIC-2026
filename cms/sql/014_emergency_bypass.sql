-- Phase 2 #3: emergency publish bypass + mandatory post-publication review

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS emergency_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emergency_published_by UUID REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS emergency_reason TEXT,
  ADD COLUMN IF NOT EXISTS needs_post_review BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS content_items_needs_post_review_idx
  ON content_items (needs_post_review)
  WHERE needs_post_review = TRUE;

COMMENT ON COLUMN content_items.needs_post_review IS
  'True after Super Admin emergency publish until Confirm OK or Unpublish.';
COMMENT ON COLUMN content_items.emergency_published_by IS
  'User who ran emergency publish (cannot Confirm OK on the same item).';
