import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";

export type PublicResearchGroupMember = {
  name_ar: string;
  name_en?: string;
};

/** Public item shape persisted to content_items.live_payload and served as data/research-groups.json. */
export type PublicResearchGroup = {
  id: string;
  slug: string;
  orgUnitId: string;
  name_ar: string;
  name_en: string;
  summary_ar: string;
  summary_en: string;
  lead_ar: string;
  lead_en: string;
  members: PublicResearchGroupMember[];
} & PublicSeoFields;

export function normalizeResearchMembers(raw: unknown): PublicResearchGroupMember[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicResearchGroupMember[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const nameAr = typeof e.name_ar === "string" ? e.name_ar.trim() : "";
    if (!nameAr) continue;
    const member: PublicResearchGroupMember = { name_ar: nameAr };
    if (typeof e.name_en === "string" && e.name_en.trim()) member.name_en = e.name_en.trim();
    out.push(member);
  }
  return out;
}

type PayloadSource = {
  id: string;
  org_unit_id: string;
  title_ar: string;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  research_lead_ar: string | null;
  research_lead_en: string | null;
  research_members: unknown;
  public_slug?: string | null;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
};

/** Public object for a research_group row (persisted to content_items.live_payload). */
export function buildResearchGroupPayload(row: PayloadSource): PublicResearchGroup {
  return withPublicSeo(
    {
      id: row.id,
      slug: row.public_slug?.trim() || row.id,
      orgUnitId: row.org_unit_id,
      name_ar: row.title_ar.trim(),
      name_en: row.title_en?.trim() || "",
      summary_ar: row.summary_ar?.trim() || "",
      summary_en: row.summary_en?.trim() || "",
      lead_ar: row.research_lead_ar?.trim() || "",
      lead_en: row.research_lead_en?.trim() || "",
      members: normalizeResearchMembers(row.research_members),
    },
    row,
  );
}

function publicResearchGroupsPath(): string {
  return join(process.cwd(), "..", "data", "research-groups.json");
}

export async function rebuildPublicResearchGroupsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicResearchGroup }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'research_group' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const items: PublicResearchGroup[] = result.rows.map((row) => ({
    ...row.live_payload,
    ...seoFromRow(row.live_payload),
  }));

  const path = publicResearchGroupsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ items }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { items: unknown };
  if (!Array.isArray(check.items)) {
    throw new Error("Published research-groups.json invalid after write");
  }

  return { count: items.length, path };
}
