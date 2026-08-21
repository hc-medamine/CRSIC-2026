import { getItemPeopleMeta, type PersonRef } from "@/lib/content/people";

/** Fixed public credit — not the last CMS audit actor. */
export const PUBLIC_PUBLISHER_AR = "فريحة بوفاتح";
export const PUBLIC_PUBLISHER_EN = "Fariha Boufatah";

export type PublicBylineFields = {
  editor_ar: string;
  editor_en: string;
  reviewer_ar: string;
  reviewer_en: string;
  publisher_ar: string;
  publisher_en: string;
};

export type PersonNameInput = {
  nameAr?: string | null;
  nameEn?: string | null;
  displayName?: string | null;
} | null;

export function personPublicNames(person: PersonNameInput): { ar: string; en: string } {
  if (!person) return { ar: "", en: "" };
  const display = (person.displayName || "").trim();
  const ar = (person.nameAr || "").trim() || display;
  const en = (person.nameEn || "").trim() || display || ar;
  return { ar, en: en || ar };
}

export function publicBylineFromPeople(
  editor: PersonNameInput,
  reviewer: PersonNameInput,
): PublicBylineFields {
  const e = personPublicNames(editor);
  const r = personPublicNames(reviewer);
  return {
    editor_ar: e.ar,
    editor_en: e.en,
    reviewer_ar: r.ar,
    reviewer_en: r.en,
    publisher_ar: PUBLIC_PUBLISHER_AR,
    publisher_en: PUBLIC_PUBLISHER_EN,
  };
}

/** Calendar date only (`YYYY-MM-DD`). Empty string if unknown. */
export function toIsoDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

/**
 * News story date: keep WordPress article date when we have it; otherwise CMS published_at.
 * Never prefer a later rebuild / live_at timestamp over a stored WP date.
 */
export function resolveNewsStoryDate(input: {
  publishedAt?: Date | string | null;
  liveDate?: string | null;
  liveDateSource?: string | null;
  liveSourcePublishedAt?: string | null;
  wpDate?: string | null;
}): { date: string; date_source: "wp" | "cms" } {
  const wp =
    toIsoDate(input.wpDate) ||
    (input.liveDateSource === "wp" ? toIsoDate(input.liveDate) : "") ||
    toIsoDate(input.liveSourcePublishedAt);
  if (wp) return { date: wp, date_source: "wp" };
  const cms = toIsoDate(input.publishedAt) || toIsoDate(input.liveDate);
  if (cms) return { date: cms, date_source: "cms" };
  return { date: "", date_source: "cms" };
}

/**
 * Public reviewer is review_owner when set, else last review-role actor.
 * (CMS Edit/review UI still shows last actor via getItemPeopleMeta.)
 */
export async function loadPublicByline(contentItemId: string): Promise<PublicBylineFields> {
  const meta = await getItemPeopleMeta(contentItemId);
  const reviewer = meta.reviewOwner ?? meta.reviewer;
  return publicBylineFromPeople(meta.editor as PersonRef | null, reviewer as PersonRef | null);
}
