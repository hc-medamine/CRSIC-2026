-- User scopes: org units + content types (PRD)

CREATE TABLE IF NOT EXISTS user_org_scopes (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  org_unit_id TEXT NOT NULL REFERENCES org_units (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, org_unit_id)
);

CREATE TABLE IF NOT EXISTS user_content_scopes (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('news', 'event', 'publication')),
  PRIMARY KEY (user_id, content_type)
);

CREATE INDEX IF NOT EXISTS user_org_scopes_org_idx ON user_org_scopes (org_unit_id);
CREATE INDEX IF NOT EXISTS user_content_scopes_type_idx ON user_content_scopes (content_type);
