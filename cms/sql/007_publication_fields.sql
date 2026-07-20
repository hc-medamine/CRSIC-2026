-- Publication-specific fields on content_items

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS pub_kind TEXT
    CHECK (pub_kind IS NULL OR pub_kind IN ('collective', 'individual'));
