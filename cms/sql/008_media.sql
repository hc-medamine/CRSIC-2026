-- Media assets uploaded via CMS (images + PDFs)

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL CHECK (bucket IN ('news', 'events', 'covers')),
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INT NOT NULL CHECK (byte_size > 0),
  extension TEXT NOT NULL,
  public_path TEXT NOT NULL UNIQUE,
  uploaded_by UUID NOT NULL REFERENCES users (id),
  replaced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_assets_bucket_idx ON media_assets (bucket);
CREATE INDEX IF NOT EXISTS media_assets_uploaded_by_idx ON media_assets (uploaded_by);
