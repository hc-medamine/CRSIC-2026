-- Card-sized derivative of the primary/cover image (SPA cards). Master stays image_path.
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS image_card_path TEXT;
