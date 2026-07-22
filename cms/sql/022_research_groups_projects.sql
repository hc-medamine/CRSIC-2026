-- Research groups/projects content types + fix org catalogs and exclusivity.
-- Centre-wide: news/event/publication/partner/alert (unique across orgs).
-- Research depts: research_group + research_project (allowed on every research_dept).

-- Widen CHECKs ----------------------------------------------------------------
DO $$
DECLARE
  cname text;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_content_scopes',
    'content_items',
    'org_unit_content_types',
    'editor_content_type_claims'
  ]
  LOOP
    SELECT con.conname INTO cname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = tbl
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%content_type%';
    IF cname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tbl, cname);
    END IF;
  END LOOP;

  ALTER TABLE user_content_scopes
    ADD CONSTRAINT user_content_scopes_content_type_check
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project'
    ));

  ALTER TABLE content_items
    ADD CONSTRAINT content_items_content_type_check
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project'
    ));

  ALTER TABLE org_unit_content_types
    ADD CONSTRAINT org_unit_content_types_content_type_check
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project'
    ));
END $$;

-- SPA types unique across orgs; research types may repeat per dept --------------
DROP INDEX IF EXISTS org_unit_content_types_content_type_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS org_unit_content_types_spa_type_uidx
  ON org_unit_content_types (content_type)
  WHERE content_type IN ('news', 'event', 'publication', 'partner', 'alert');

-- Rebuild catalogs: centre_wide = SPA five; each research_dept = group+project --
DELETE FROM org_unit_content_types;

INSERT INTO org_unit_content_types (org_unit_id, content_type)
SELECT 'centre_wide', t
FROM (VALUES ('news'), ('event'), ('publication'), ('partner'), ('alert')) AS v(t)
WHERE EXISTS (SELECT 1 FROM org_units WHERE id = 'centre_wide');

INSERT INTO org_unit_content_types (org_unit_id, content_type)
SELECT o.id, t.content_type
FROM org_units o
CROSS JOIN (VALUES ('research_group'), ('research_project')) AS t(content_type)
WHERE o.kind = 'research_dept';

-- Research-specific columns on content_items -----------------------------------
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS research_group_id UUID REFERENCES content_items (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS research_lead_ar TEXT,
  ADD COLUMN IF NOT EXISTS research_lead_en TEXT,
  ADD COLUMN IF NOT EXISTS research_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS research_questions_ar TEXT,
  ADD COLUMN IF NOT EXISTS research_questions_en TEXT,
  ADD COLUMN IF NOT EXISTS research_axes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS research_duration_ar TEXT,
  ADD COLUMN IF NOT EXISTS research_duration_en TEXT,
  ADD COLUMN IF NOT EXISTS research_impacts JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS content_items_research_group_id_idx
  ON content_items (research_group_id)
  WHERE content_type = 'research_project';

CREATE INDEX IF NOT EXISTS content_items_research_org_idx
  ON content_items (org_unit_id)
  WHERE content_type IN ('research_group', 'research_project');

-- Editor claims: SPA global exclusivity; research exclusivity per org ----------
DROP TABLE IF EXISTS editor_content_type_claims;

CREATE TABLE editor_content_type_claims (
  content_type TEXT NOT NULL
    CHECK (content_type IN (
      'news', 'event', 'publication', 'partner', 'alert',
      'research_group', 'research_project'
    )),
  editor_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  org_unit_id TEXT REFERENCES org_units (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editor_content_type_claims_org_ck CHECK (
    (content_type IN ('news', 'event', 'publication', 'partner', 'alert') AND org_unit_id IS NULL)
    OR
    (content_type IN ('research_group', 'research_project') AND org_unit_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX editor_claims_spa_uidx
  ON editor_content_type_claims (content_type)
  WHERE org_unit_id IS NULL;

CREATE UNIQUE INDEX editor_claims_research_uidx
  ON editor_content_type_claims (content_type, org_unit_id)
  WHERE org_unit_id IS NOT NULL;

CREATE INDEX editor_content_type_claims_editor_idx
  ON editor_content_type_claims (editor_id);

-- Backfill SPA claims (global) from editors who hold SPA types
INSERT INTO editor_content_type_claims (content_type, editor_id, org_unit_id)
SELECT DISTINCT ON (ucs.content_type) ucs.content_type, ucs.user_id, NULL
FROM user_content_scopes ucs
JOIN users u ON u.id = ucs.user_id AND u.role = 'editor'
WHERE ucs.content_type IN ('news', 'event', 'publication', 'partner', 'alert')
ORDER BY ucs.content_type, u.created_at ASC, u.id ASC;

-- Backfill research claims per org overlap
INSERT INTO editor_content_type_claims (content_type, editor_id, org_unit_id)
SELECT DISTINCT ON (ucs.content_type, uos.org_unit_id)
  ucs.content_type, ucs.user_id, uos.org_unit_id
FROM user_content_scopes ucs
JOIN users u ON u.id = ucs.user_id AND u.role = 'editor'
JOIN user_org_scopes uos ON uos.user_id = u.id
JOIN org_units o ON o.id = uos.org_unit_id AND o.kind = 'research_dept'
WHERE ucs.content_type IN ('research_group', 'research_project')
ORDER BY ucs.content_type, uos.org_unit_id, u.created_at ASC, u.id ASC;

-- Strip SPA types from research-dept editors' scopes if any leftover mismatch
DELETE FROM user_content_scopes ucs
WHERE ucs.content_type IN ('news', 'event', 'publication', 'partner', 'alert')
  AND EXISTS (
    SELECT 1 FROM user_org_scopes uos
    JOIN org_units o ON o.id = uos.org_unit_id
    WHERE uos.user_id = ucs.user_id AND o.kind = 'research_dept'
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_org_scopes uos2
    WHERE uos2.user_id = ucs.user_id AND uos2.org_unit_id = 'centre_wide'
  );
