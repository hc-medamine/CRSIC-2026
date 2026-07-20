-- Org units for permission scopes (PRD §3)

CREATE TABLE IF NOT EXISTS org_units (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('centre_wide', 'research_dept')),
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO org_units (id, name_ar, name_en, kind, sort_order) VALUES
  ('centre_wide', 'على مستوى المركز', 'Centre-wide', 'centre_wide', 0),
  ('dept_quran_fiqh', 'قسم الدراسات القرآنية والفقهية', 'Qur''anic and Fiqh Studies', 'research_dept', 1),
  ('dept_thought_dialogue', 'قسم الفكر والعقيدة والحوار مع الغير', 'Thought, Creed and Dialogue', 'research_dept', 2),
  ('dept_algeria_history', 'قسم التاريخ الثقافي للجزائر', 'Cultural History of Algeria', 'research_dept', 3),
  ('dept_islamic_civ', 'قسم الحضارة الإسلامية', 'Islamic Civilization', 'research_dept', 4)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  kind = EXCLUDED.kind,
  sort_order = EXCLUDED.sort_order;
