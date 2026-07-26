-- Q1=B: preview tokens for all seven CMS content types.

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
      'research_group', 'research_project'
    ));
END $$;
