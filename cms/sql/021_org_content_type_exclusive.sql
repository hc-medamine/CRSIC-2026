-- Each content type belongs to at most one org (SPA section mapping).

-- Prefer centre_wide, else lowest sort_order / id.
DELETE FROM org_unit_content_types ouct
WHERE NOT EXISTS (
  SELECT 1
  FROM (
    SELECT DISTINCT ON (c.content_type) c.org_unit_id, c.content_type
    FROM org_unit_content_types c
    JOIN org_units u ON u.id = c.org_unit_id
    ORDER BY c.content_type,
      CASE WHEN c.org_unit_id = 'centre_wide' THEN 0 ELSE 1 END,
      u.sort_order ASC,
      c.org_unit_id ASC
  ) keep
  WHERE keep.org_unit_id = ouct.org_unit_id
    AND keep.content_type = ouct.content_type
);

CREATE UNIQUE INDEX IF NOT EXISTS org_unit_content_types_content_type_uidx
  ON org_unit_content_types (content_type);
