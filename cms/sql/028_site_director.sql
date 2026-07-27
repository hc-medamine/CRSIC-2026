-- Site director singleton + site media bucket for portrait uploads.

CREATE TABLE IF NOT EXISTS site_director (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  quote_ar TEXT NOT NULL DEFAULT '',
  quote_en TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  role_ar TEXT NOT NULL DEFAULT '',
  role_en TEXT NOT NULL DEFAULT '',
  portrait_path TEXT,
  portrait_alt_ar TEXT,
  portrait_alt_en TEXT,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

INSERT INTO site_director (id, quote_ar, quote_en, name_ar, name_en, role_ar, role_en, portrait_path)
VALUES (
  1,
  'نعمل معًا على تعزيز البحث العلمي الأصيل في العلوم الإسلامية والحضارة، خدمةً للمعرفة وللمجتمع.',
  'Together we strengthen authentic research in Islamic sciences and civilisation, in service of knowledge and society.',
  'اسم المدير (placeholder)',
  'Director name (placeholder)',
  'مدير المركز',
  'Centre Director',
  'img/Holders/0.jpg'
)
ON CONFLICT (id) DO NOTHING;

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
      'news', 'events', 'covers', 'partners', 'research', 'alerts',
      'laws', 'platforms', 'site'
    ));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
