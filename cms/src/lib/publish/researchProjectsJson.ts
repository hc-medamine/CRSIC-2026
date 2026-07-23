import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";

export type PublicResearchBilingualEntry = {
  ar: string;
  en?: string;
};

/** Public item shape persisted to content_items.live_payload and served as data/research-projects.json. */
export type PublicResearchProject = {
  id: string;
  slug: string;
  orgUnitId: string;
  groupId: string | null;
  title_ar: string;
  title_en: string;
  lead_ar: string;
  lead_en: string;
  dibaja_ar: string;
  dibaja_en: string;
  questions_ar: string;
  questions_en: string;
  axes: PublicResearchBilingualEntry[];
  duration_ar: string;
  duration_en: string;
  impacts: PublicResearchBilingualEntry[];
} & PublicSeoFields;

export function normalizeResearchEntries(raw: unknown): PublicResearchBilingualEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicResearchBilingualEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const ar = typeof e.ar === "string" ? e.ar.trim() : "";
    if (!ar) continue;
    const item: PublicResearchBilingualEntry = { ar };
    if (typeof e.en === "string" && e.en.trim()) item.en = e.en.trim();
    out.push(item);
  }
  return out;
}

type PayloadSource = {
  id: string;
  org_unit_id: string;
  research_group_id: string | null;
  title_ar: string;
  title_en: string | null;
  research_lead_ar: string | null;
  research_lead_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  research_questions_ar: string | null;
  research_questions_en: string | null;
  research_axes: unknown;
  research_duration_ar: string | null;
  research_duration_en: string | null;
  research_impacts: unknown;
  public_slug?: string | null;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
};

/** Public object for a research_project row (persisted to content_items.live_payload). */
export function buildResearchProjectPayload(row: PayloadSource): PublicResearchProject {
  return withPublicSeo(
    {
      id: row.id,
      slug: row.public_slug?.trim() || row.id,
      orgUnitId: row.org_unit_id,
      groupId: row.research_group_id ?? null,
      title_ar: row.title_ar.trim(),
      title_en: row.title_en?.trim() || "",
      lead_ar: row.research_lead_ar?.trim() || "",
      lead_en: row.research_lead_en?.trim() || "",
      dibaja_ar: row.body_ar?.trim() || "",
      dibaja_en: row.body_en?.trim() || "",
      questions_ar: row.research_questions_ar?.trim() || "",
      questions_en: row.research_questions_en?.trim() || "",
      axes: normalizeResearchEntries(row.research_axes),
      duration_ar: row.research_duration_ar?.trim() || "",
      duration_en: row.research_duration_en?.trim() || "",
      impacts: normalizeResearchEntries(row.research_impacts),
    },
    row,
  );
}

function publicResearchProjectsPath(): string {
  return join(process.cwd(), "..", "data", "research-projects.json");
}

export async function rebuildPublicResearchProjectsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicResearchProject }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'research_project' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const items: PublicResearchProject[] = result.rows.map((row) => ({
    ...row.live_payload,
    ...seoFromRow(row.live_payload),
  }));

  const path = publicResearchProjectsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ items }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { items: unknown };
  if (!Array.isArray(check.items)) {
    throw new Error("Published research-projects.json invalid after write");
  }

  return { count: items.length, path };
}
