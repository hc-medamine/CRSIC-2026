-- Multi-media attachments for public detail pages (images + PDFs).
-- Shape: [{ "kind": "image"|"pdf", "src": "path", "alt": "optional" }]

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN content_items.attachments IS
  'Public media list: [{kind:image|pdf, src, alt?}]. Primary card image is first image (or image_path).';
