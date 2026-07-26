-- Q4=B: dedicated media buckets for partners, research, and alerts.

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
    CHECK (bucket IN ('news', 'events', 'covers', 'partners', 'research', 'alerts'));
END $$;
