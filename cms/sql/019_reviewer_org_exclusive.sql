-- Reviewer exclusive org scopes: cleanup overlapping claims, then enforce uniqueness.
-- Keep earliest active reviewer per org_unit_id; remove extras.

DELETE FROM user_org_scopes uos
WHERE uos.user_id IN (SELECT id FROM users WHERE role = 'reviewer')
  AND EXISTS (
    SELECT 1
    FROM user_org_scopes keep
    JOIN users uk ON uk.id = keep.user_id AND uk.role = 'reviewer'
    JOIN users u_drop ON u_drop.id = uos.user_id AND u_drop.role = 'reviewer'
    WHERE keep.org_unit_id = uos.org_unit_id
      AND keep.user_id <> uos.user_id
      AND (
        uk.created_at < u_drop.created_at
        OR (uk.created_at = u_drop.created_at AND keep.user_id < uos.user_id)
      )
  );

-- One active reviewer may claim each org unit (partial unique via expression not possible
-- across users table easily). Application enforces; this index prevents duplicate rows
-- for the same user+org (already PK-like). Add claim table for exclusivity:

CREATE TABLE IF NOT EXISTS reviewer_org_claims (
  org_unit_id TEXT PRIMARY KEY REFERENCES org_units (id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviewer_org_claims_reviewer_idx
  ON reviewer_org_claims (reviewer_id);

-- Rebuild claims from remaining reviewer scopes
TRUNCATE reviewer_org_claims;

INSERT INTO reviewer_org_claims (org_unit_id, reviewer_id)
SELECT DISTINCT ON (uos.org_unit_id) uos.org_unit_id, uos.user_id
FROM user_org_scopes uos
JOIN users u ON u.id = uos.user_id AND u.role = 'reviewer'
ORDER BY uos.org_unit_id, u.created_at ASC, u.id ASC;
