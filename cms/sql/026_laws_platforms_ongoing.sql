-- Laws + platforms content types; external_url + platform_kind columns

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
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project', 'law', 'platform'
    ));
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
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project', 'law', 'platform'
    ));
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
    AND rel.relname = 'org_unit_content_types'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%content_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE org_unit_content_types DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE org_unit_content_types
    ADD CONSTRAINT org_unit_content_types_content_type_check
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project', 'law', 'platform'
    ));
EXCEPTION WHEN undefined_table THEN
  NULL;
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
    AND rel.relname = 'editor_content_type_claims'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%content_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE editor_content_type_claims DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE editor_content_type_claims
    ADD CONSTRAINT editor_content_type_claims_content_type_check
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project', 'law', 'platform'
    ));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- SPA claims use org_unit_id IS NULL; research claims require org_unit_id.
-- Keep law/platform on the SPA branch (see also 027 for DBs that already ran 026).
DO $$
BEGIN
  ALTER TABLE editor_content_type_claims
    DROP CONSTRAINT IF EXISTS editor_content_type_claims_org_ck;
  ALTER TABLE editor_content_type_claims
    ADD CONSTRAINT editor_content_type_claims_org_ck CHECK (
      (
        content_type IN (
          'news', 'event', 'publication', 'partner', 'alert', 'law', 'platform'
        )
        AND org_unit_id IS NULL
      )
      OR
      (
        content_type IN ('research_group', 'research_project')
        AND org_unit_id IS NOT NULL
      )
    );
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS platform_kind TEXT
    CHECK (platform_kind IS NULL OR platform_kind IN ('visual', 'radio', 'mobility'));

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
    AND pg_get_constraintdef(con.oid) LIKE '%event_display_status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE content_items DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE content_items
    ADD CONSTRAINT content_items_event_display_status_check
    CHECK (event_display_status IS NULL OR event_display_status IN ('upcoming', 'ongoing', 'done'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS content_items_platform_kind_idx
  ON content_items (platform_kind)
  WHERE content_type = 'platform';

-- Centre-wide catalog: allow law + platform
INSERT INTO org_unit_content_types (org_unit_id, content_type)
SELECT 'centre_wide', t
FROM (VALUES ('law'), ('platform')) AS v(t)
WHERE EXISTS (SELECT 1 FROM org_units WHERE id = 'centre_wide')
  AND NOT EXISTS (
    SELECT 1 FROM org_unit_content_types o WHERE o.content_type = v.t
  );

DROP INDEX IF EXISTS org_unit_content_types_spa_type_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS org_unit_content_types_spa_type_uidx
  ON org_unit_content_types (content_type)
  WHERE content_type IN (
    'news', 'event', 'publication', 'partner', 'alert', 'law', 'platform'
  );

-- Media buckets for laws / platforms
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'media_assets'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%bucket%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE media_assets DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE media_assets
    ADD CONSTRAINT media_assets_bucket_check
    CHECK (bucket IN (
      'news', 'events', 'covers', 'partners', 'research', 'alerts', 'laws', 'platforms'
    ));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Preview tokens: law + platform
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'preview_tokens'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%content_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE preview_tokens DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE preview_tokens
    ADD CONSTRAINT preview_tokens_content_type_check
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project', 'law', 'platform'
    ));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
