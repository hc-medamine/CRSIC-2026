-- News content items + revisions (Step 4)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE content_status AS ENUM (
      'draft',
      'submitted',
      'changes_requested',
      'approved',
      'published',
      'unpublished',
      'rejected'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('news', 'event', 'publication')),
  status content_status NOT NULL DEFAULT 'draft',
  org_unit_id TEXT NOT NULL REFERENCES org_units (id),
  created_by UUID NOT NULL REFERENCES users (id),
  updated_by UUID REFERENCES users (id),
  en_status TEXT NOT NULL DEFAULT 'pending' CHECK (en_status IN ('pending', 'ready')),
  title_ar TEXT NOT NULL DEFAULT '',
  title_en TEXT,
  label_ar TEXT,
  label_en TEXT,
  summary_ar TEXT,
  summary_en TEXT,
  body_ar TEXT,
  body_en TEXT,
  image_path TEXT,
  image_alt_ar TEXT,
  image_alt_en TEXT,
  checklist_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  review_note TEXT,
  public_slug TEXT UNIQUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_items_type_status_idx
  ON content_items (content_type, status);
CREATE INDEX IF NOT EXISTS content_items_org_idx ON content_items (org_unit_id);
CREATE INDEX IF NOT EXISTS content_items_created_by_idx ON content_items (created_by);

CREATE TABLE IF NOT EXISTS content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items (id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  status content_status NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_item_id, revision_number)
);

CREATE INDEX IF NOT EXISTS content_revisions_item_idx
  ON content_revisions (content_item_id, revision_number DESC);
