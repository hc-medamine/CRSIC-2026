-- Drop orphan columns left after 016_drop_static_pages removed content_type = 'page'.
-- Index content_items_page_key_published_uidx was already dropped in 016.

ALTER TABLE content_items
  DROP COLUMN IF EXISTS page_key,
  DROP COLUMN IF EXISTS page_fields;
