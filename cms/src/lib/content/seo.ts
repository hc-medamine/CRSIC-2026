/** Locked PRD lengths: L1 — title 60, description 160. */
export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 160;

export type SeoInput = {
  metaTitleAr?: string;
  metaTitleEn?: string;
  metaDescriptionAr?: string;
  metaDescriptionEn?: string;
  ogImage?: string | null;
};

export type SeoColumns = {
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
  og_image: string | null;
};

/** Public JSON SEO fields (F1). Empty strings omitted by callers if desired. */
export type PublicSeoFields = {
  meta_title_ar?: string;
  meta_title_en?: string;
  meta_description_ar?: string;
  meta_description_en?: string;
  og_image?: string | null;
};

function clipOrThrow(label: string, raw: string | undefined, max: number): string | null {
  const v = raw?.trim() || "";
  if (!v) return null;
  if (v.length > max) {
    throw new Error(`${label} must be at most ${max} characters`);
  }
  return v;
}

export function normalizeSeoInput(input: SeoInput): SeoColumns {
  return {
    meta_title_ar: clipOrThrow("Meta title (AR)", input.metaTitleAr, META_TITLE_MAX),
    meta_title_en: clipOrThrow("Meta title (EN)", input.metaTitleEn, META_TITLE_MAX),
    meta_description_ar: clipOrThrow(
      "Meta description (AR)",
      input.metaDescriptionAr,
      META_DESCRIPTION_MAX,
    ),
    meta_description_en: clipOrThrow(
      "Meta description (EN)",
      input.metaDescriptionEn,
      META_DESCRIPTION_MAX,
    ),
    og_image: input.ogImage?.trim() || null,
  };
}

export function seoFromRow(row: {
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
}): PublicSeoFields {
  const out: PublicSeoFields = {};
  if (row.meta_title_ar?.trim()) out.meta_title_ar = row.meta_title_ar.trim();
  if (row.meta_title_en?.trim()) out.meta_title_en = row.meta_title_en.trim();
  if (row.meta_description_ar?.trim()) out.meta_description_ar = row.meta_description_ar.trim();
  if (row.meta_description_en?.trim()) out.meta_description_en = row.meta_description_en.trim();
  if (row.og_image?.trim()) out.og_image = row.og_image.trim();
  return out;
}

/** Merge SEO onto a public payload object. */
export function withPublicSeo<T extends object>(
  payload: T,
  row: {
    meta_title_ar?: string | null;
    meta_title_en?: string | null;
    meta_description_ar?: string | null;
    meta_description_en?: string | null;
    og_image?: string | null;
  },
): T & PublicSeoFields {
  return { ...payload, ...seoFromRow(row) };
}

export function seoSnapshotFields(row: SeoColumns | Record<string, unknown>) {
  return {
    meta_title_ar: (row as SeoColumns).meta_title_ar ?? null,
    meta_title_en: (row as SeoColumns).meta_title_en ?? null,
    meta_description_ar: (row as SeoColumns).meta_description_ar ?? null,
    meta_description_en: (row as SeoColumns).meta_description_en ?? null,
    og_image: (row as SeoColumns).og_image ?? null,
  };
}
