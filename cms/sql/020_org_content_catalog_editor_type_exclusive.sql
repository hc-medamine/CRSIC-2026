-- Per-org content-type catalogs + global Editor content-type exclusivity.

CREATE TABLE IF NOT EXISTS org_unit_content_types (
  org_unit_id TEXT NOT NULL REFERENCES org_units (id) ON DELETE CASCADE,
  content_type TEXT NOT NULL
    CHECK (content_type IN ('news', 'event', 'publication', 'partner', 'alert')),
  PRIMARY KEY (org_unit_id, content_type)
);

-- Default: every existing org allows all five types (keeps current Editors valid).
INSERT INTO org_unit_content_types (org_unit_id, content_type)
SELECT o.id, t.content_type
FROM org_units o
CROSS JOIN (
  VALUES ('news'), ('event'), ('publication'), ('partner'), ('alert')
) AS t(content_type)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS editor_content_type_claims (
  content_type TEXT PRIMARY KEY
    CHECK (content_type IN ('news', 'event', 'publication', 'partner', 'alert')),
  editor_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editor_content_type_claims_editor_idx
  ON editor_content_type_claims (editor_id);

-- Fail loud if two Editors already share a content type.
DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(fmt, ', ' ORDER BY fmt)
  INTO conflicts
  FROM (
    SELECT content_type || ' ×' || COUNT(DISTINCT user_id)::text AS fmt
    FROM user_content_scopes ucs
    JOIN users u ON u.id = ucs.user_id AND u.role = 'editor'
    GROUP BY content_type
    HAVING COUNT(DISTINCT user_id) > 1
  ) x;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot apply 020_org_content_catalog_editor_type_exclusive: duplicate Editor content types (%). Resolve so each type is held by at most one Editor, then re-run migrations.',
      conflicts;
  END IF;
END $$;

TRUNCATE editor_content_type_claims;

INSERT INTO editor_content_type_claims (content_type, editor_id)
SELECT DISTINCT ON (ucs.content_type) ucs.content_type, ucs.user_id
FROM user_content_scopes ucs
JOIN users u ON u.id = ucs.user_id AND u.role = 'editor'
ORDER BY ucs.content_type, u.created_at ASC, u.id ASC;
