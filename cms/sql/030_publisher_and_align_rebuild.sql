-- Public publisher credit (news/event cards) + Align-page rebuild badge.

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS content_items_publisher_idx
  ON content_items (publisher_id)
  WHERE publisher_id IS NOT NULL;

COMMENT ON COLUMN content_items.publisher_id IS
  'Public publisher byline (news/event JSON). Reviewer scoped to the item org; null → Boufatah fallback.';

CREATE TABLE IF NOT EXISTS site_align_rebuild (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_success_at TIMESTAMPTZ,
  last_success_actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
  last_success_actor_email TEXT,
  last_success_news_count INTEGER,
  last_success_event_count INTEGER,
  last_success_skipped BOOLEAN NOT NULL DEFAULT FALSE,
  last_attempt_at TIMESTAMPTZ,
  last_attempt_ok BOOLEAN,
  last_attempt_error TEXT,
  last_attempt_actor_id UUID REFERENCES users (id) ON DELETE SET NULL
);

INSERT INTO site_align_rebuild (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
