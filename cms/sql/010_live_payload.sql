-- Live public payload for the "published → create revision (public stays live)" flow (Step 4, gap #5)
--
-- Public JSON is rebuilt from rows WHERE live_payload IS NOT NULL (not only status = 'published').
-- On publish: set live_payload to the P1 public object + status = 'published'.
-- On unpublish: clear live_payload + status = 'unpublished'.
-- On "create revision": status → 'draft' but live_payload is KEPT so the public site stays live
-- until the next publish replaces it.

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS live_payload JSONB,
  ADD COLUMN IF NOT EXISTS live_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS content_items_live_idx
  ON content_items (content_type)
  WHERE live_payload IS NOT NULL;
