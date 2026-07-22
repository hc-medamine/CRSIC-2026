-- Phase 3: partners, alerts, static pages — widen content_type + new columns

-- Widen user_content_scopes.content_type CHECK
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'user_content_scopes'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%content_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_content_scopes DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE user_content_scopes
    ADD CONSTRAINT user_content_scopes_content_type_check
    CHECK (content_type IN ('news', 'event', 'publication', 'partner', 'alert', 'page'));
END $$;

-- Widen content_items.content_type CHECK
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'content_items'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%content_type%'
    AND pg_get_constraintdef(con.oid) LIKE '%news%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE content_items DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE content_items
    ADD CONSTRAINT content_items_content_type_check
    CHECK (content_type IN ('news', 'event', 'publication', 'partner', 'alert', 'page'));
END $$;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS partner_scope TEXT
    CHECK (partner_scope IS NULL OR partner_scope IN ('intl', 'nat')),
  ADD COLUMN IF NOT EXISTS partner_date TEXT,
  ADD COLUMN IF NOT EXISTS partner_emoji TEXT,
  ADD COLUMN IF NOT EXISTS alert_link_url TEXT,
  ADD COLUMN IF NOT EXISTS alert_link_label_ar TEXT,
  ADD COLUMN IF NOT EXISTS alert_link_label_en TEXT,
  ADD COLUMN IF NOT EXISTS page_key TEXT
    CHECK (page_key IS NULL OR page_key IN ('about', 'cooperation', 'org', 'contact')),
  ADD COLUMN IF NOT EXISTS page_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS content_items_page_key_published_uidx
  ON content_items (page_key)
  WHERE content_type = 'page' AND status = 'published' AND page_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS content_items_partner_scope_idx
  ON content_items (partner_scope)
  WHERE content_type = 'partner';
