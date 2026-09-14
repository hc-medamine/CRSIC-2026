-- Events two-level taxonomy (PRD 2026-09-14).
-- Replaces free-text event_type_* + event_scope as taxonomy source with
-- event_section (activities|meetings) + event_category (7 locked ids).
-- Keeps event_type_ar/en + event_scope derived for transition / old consumers.
--
-- Order matters: backfill both columns together BEFORE the pair CHECK.

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_section TEXT
    CHECK (event_section IS NULL OR event_section IN ('activities', 'meetings'));

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS event_category TEXT
    CHECK (
      event_category IS NULL
      OR event_category IN (
        'lecture', 'visit', 'training', 'study_day', 'intl', 'nat', 'cultural'
      )
    );

-- Remap category from legacy type (wins) then scope (mirrors resolveLegacyCategory),
-- and set matching section in the same UPDATE so pair integrity holds before CHECK.
UPDATE content_items
SET
  event_category = cat.cat_id,
  event_section = CASE
    WHEN cat.cat_id IN ('lecture', 'visit', 'training', 'study_day') THEN 'activities'
    ELSE 'meetings'
  END,
  event_type_ar = CASE cat.cat_id
    WHEN 'lecture' THEN 'محاضرات علمية'
    WHEN 'visit' THEN 'زيارات علمية'
    WHEN 'training' THEN 'دورات تكوينية'
    WHEN 'study_day' THEN 'أيام دراسية'
    WHEN 'intl' THEN 'ملتقيات دولية'
    WHEN 'nat' THEN 'ملتقيات وطنية'
    WHEN 'cultural' THEN 'ملتقيات ثقافية'
    ELSE event_type_ar
  END,
  event_type_en = CASE cat.cat_id
    WHEN 'lecture' THEN 'Scientific lectures'
    WHEN 'visit' THEN 'Scientific visits'
    WHEN 'training' THEN 'Training courses'
    WHEN 'study_day' THEN 'Study days'
    WHEN 'intl' THEN 'International conferences'
    WHEN 'nat' THEN 'National conferences'
    WHEN 'cultural' THEN 'Cultural conferences'
    ELSE event_type_en
  END,
  event_scope = CASE
    WHEN cat.cat_id IN ('intl', 'cultural') THEN 'intl'
    ELSE 'nat'
  END
FROM (
  SELECT
    id AS row_id,
    COALESCE(
      CASE trim(both FROM coalesce(event_type_ar, ''))
        WHEN 'محاضرة علمية' THEN 'lecture'
        WHEN 'محاضرات علمية' THEN 'lecture'
        WHEN 'زيارة علمية' THEN 'visit'
        WHEN 'زيارات علمية' THEN 'visit'
        WHEN 'دورة تكوينية' THEN 'training'
        WHEN 'دورات تكوينية' THEN 'training'
        WHEN 'يوم دراسي' THEN 'study_day'
        WHEN 'أيام دراسية' THEN 'study_day'
        WHEN 'ملتقى وطني' THEN 'nat'
        WHEN 'ملتقيات وطنية' THEN 'nat'
        WHEN 'مؤتمر دولي' THEN 'intl'
        WHEN 'ملتقى دولي' THEN 'intl'
        WHEN 'مؤتمر علمي دولي' THEN 'intl'
        WHEN 'ملتقيات دولية' THEN 'intl'
        WHEN 'ملتقى ثقافي' THEN 'cultural'
        WHEN 'ملتقيات ثقافية' THEN 'cultural'
        ELSE NULL
      END,
      CASE event_scope
        WHEN 'intl' THEN 'intl'
        WHEN 'nat' THEN 'nat'
        ELSE NULL
      END,
      'nat'
    ) AS cat_id
  FROM content_items
  WHERE content_type = 'event'
    AND event_category IS NULL
) AS cat
WHERE content_items.id = cat.row_id;

-- Pair integrity: null together, or legal section ↔ category family.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_items_event_section_category_pair_ck'
  ) THEN
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_event_section_category_pair_ck
      CHECK (
        (event_section IS NULL AND event_category IS NULL)
        OR (
          event_section IS NOT NULL
          AND event_category IS NOT NULL
          AND (
            (
              event_section = 'activities'
              AND event_category IN ('lecture', 'visit', 'training', 'study_day')
            )
            OR (
              event_section = 'meetings'
              AND event_category IN ('intl', 'nat', 'cultural')
            )
          )
        )
      );
  END IF;
END $$;

-- Refresh live_payload taxonomy fields when present (section-based bucketing later).
UPDATE content_items
SET live_payload = live_payload
  || jsonb_build_object(
    'category', to_jsonb(event_category),
    'type', to_jsonb(event_type_ar),
    'type_en', to_jsonb(event_type_en),
    'section', to_jsonb(event_section),
    'scope', to_jsonb(event_scope)
  )
WHERE content_type = 'event'
  AND live_payload IS NOT NULL
  AND event_category IS NOT NULL
  AND event_section IS NOT NULL;
