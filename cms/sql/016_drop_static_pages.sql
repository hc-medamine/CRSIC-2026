-- Drop CMS static-pages content type (About/coop/org/contact stay in locales only).

DELETE FROM content_revisions
 WHERE content_item_id IN (SELECT id FROM content_items WHERE content_type = 'page');

DELETE FROM content_comments
 WHERE content_item_id IN (SELECT id FROM content_items WHERE content_type = 'page');

DELETE FROM content_items WHERE content_type = 'page';

DELETE FROM user_content_scopes WHERE content_type = 'page';

-- Narrow content_type CHECKs (remove 'page')
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
    CHECK (content_type IN ('news', 'event', 'publication', 'partner', 'alert'));
END $$;

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
    CHECK (content_type IN ('news', 'event', 'publication', 'partner', 'alert'));
END $$;

DROP INDEX IF EXISTS content_items_page_key_published_uidx;
