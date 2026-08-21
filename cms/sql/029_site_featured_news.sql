-- Home featured-news playlist (singleton). Draft vs live four-eyes.

CREATE TABLE IF NOT EXISTS site_featured_news (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  draft_ids UUID[] NOT NULL DEFAULT '{}',
  live_ids UUID[] NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

INSERT INTO site_featured_news (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
