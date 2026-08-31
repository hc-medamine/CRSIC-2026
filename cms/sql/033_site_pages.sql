-- Institutional site pages singleton (About, org labels, contact, cooperation intro).

CREATE TABLE IF NOT EXISTS site_pages (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fields_ar JSONB NOT NULL DEFAULT '{}'::jsonb,
  fields_en JSONB NOT NULL DEFAULT '{}'::jsonb,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  webmail_url TEXT NOT NULL DEFAULT '',
  webmail_text TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
