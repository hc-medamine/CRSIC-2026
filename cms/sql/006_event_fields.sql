-- Event-specific fields on content_items

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_scope TEXT
    CHECK (event_scope IS NULL OR event_scope IN ('intl', 'nat'));

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_day TEXT;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_month TEXT;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_year TEXT;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_type_ar TEXT;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_type_en TEXT;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_display_status TEXT
    CHECK (event_display_status IS NULL OR event_display_status IN ('upcoming', 'done'));
