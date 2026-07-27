-- Include law/platform in SPA branch of editor_content_type_claims_org_ck.
-- Migration 026 widened the content_type check but left org_ck on the old SPA list,
-- so claims with org_unit_id IS NULL for law/platform failed inserts.

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
