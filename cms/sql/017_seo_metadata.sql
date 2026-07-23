-- SEO / share metadata (authoring quality pack C — F1 field names).
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS meta_title_ar TEXT,
  ADD COLUMN IF NOT EXISTS meta_title_en TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_en TEXT,
  ADD COLUMN IF NOT EXISTS og_image TEXT;
