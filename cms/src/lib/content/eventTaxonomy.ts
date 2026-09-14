/**
 * Locked events taxonomy — mirrors js/eventTaxonomy.js (PRD 2026-09-14).
 */

export type EventSectionId = "activities" | "meetings";
export type EventCategoryId =
  | "lecture"
  | "visit"
  | "training"
  | "study_day"
  | "intl"
  | "nat"
  | "cultural";

export const EVENT_SECTION_CATEGORIES: Record<EventSectionId, readonly EventCategoryId[]> = {
  activities: ["lecture", "visit", "training", "study_day"],
  meetings: ["intl", "nat", "cultural"],
};

export const EVENT_CATEGORY_TYPE_AR: Record<EventCategoryId, string> = {
  lecture: "محاضرات علمية",
  visit: "زيارات علمية",
  training: "دورات تكوينية",
  study_day: "أيام دراسية",
  intl: "ملتقيات دولية",
  nat: "ملتقيات وطنية",
  cultural: "ملتقيات ثقافية",
};

export const EVENT_CATEGORY_TYPE_EN: Record<EventCategoryId, string> = {
  lecture: "Scientific lectures",
  visit: "Scientific visits",
  training: "Training courses",
  study_day: "Study days",
  intl: "International conferences",
  nat: "National conferences",
  cultural: "Cultural conferences",
};

const LEGACY_TYPE_TO_CATEGORY: Record<string, EventCategoryId> = {
  "محاضرة علمية": "lecture",
  "محاضرات علمية": "lecture",
  "زيارة علمية": "visit",
  "زيارات علمية": "visit",
  "دورة تكوينية": "training",
  "دورات تكوينية": "training",
  "يوم دراسي": "study_day",
  "أيام دراسية": "study_day",
  "ملتقى وطني": "nat",
  "ملتقيات وطنية": "nat",
  "مؤتمر دولي": "intl",
  "ملتقى دولي": "intl",
  "مؤتمر علمي دولي": "intl",
  "ملتقيات دولية": "intl",
  "ملتقى ثقافي": "cultural",
  "ملتقيات ثقافية": "cultural",
};

export function sectionForCategory(categoryId: string): EventSectionId | null {
  if ((EVENT_SECTION_CATEGORIES.activities as readonly string[]).includes(categoryId)) {
    return "activities";
  }
  if ((EVENT_SECTION_CATEGORIES.meetings as readonly string[]).includes(categoryId)) {
    return "meetings";
  }
  return null;
}

export function isValidEventPair(section: string, category: string): boolean {
  const sec = sectionForCategory(category);
  return sec !== null && sec === section;
}

export function resolveLegacyCategory(
  legacyType?: string | null,
  legacyScope?: string | null,
): EventCategoryId | null {
  const raw = String(legacyType || "").trim();
  if (raw && LEGACY_TYPE_TO_CATEGORY[raw]) return LEGACY_TYPE_TO_CATEGORY[raw];
  if (legacyScope === "intl") return "intl";
  if (legacyScope === "nat") return "nat";
  return null;
}

/** Derive legacy event_scope for any remaining consumers during transition. */
export function legacyScopeForCategory(category: EventCategoryId): "intl" | "nat" {
  if (category === "intl" || category === "cultural") return "intl";
  return "nat";
}
