-- A1 draft preview tokens (authoring quality pack).
-- Short-lived candidate payloads for SPA #preview/{token}; never written to live JSON.

CREATE TABLE IF NOT EXISTS preview_tokens (
  token TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('news', 'event', 'publication')),
  content_item_id UUID NOT NULL REFERENCES content_items (id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS preview_tokens_expires_idx ON preview_tokens (expires_at);
CREATE INDEX IF NOT EXISTS preview_tokens_item_idx ON preview_tokens (content_item_id);
