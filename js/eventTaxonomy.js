/**
 * Locked events taxonomy (PRD 2026-09-14-spa-cms-events-two-level-taxonomy).
 * Section tabs + subcategory chips; labels via i18n keys where noted.
 */

/** @typedef {'activities'|'meetings'} EventSectionId */
/** @typedef {'lecture'|'visit'|'training'|'study_day'|'intl'|'nat'|'cultural'} EventCategoryId */

/** @type {Record<EventSectionId, EventCategoryId[]>} */
export const EVENT_SECTION_CATEGORIES = {
  activities: ['lecture', 'visit', 'training', 'study_day'],
  meetings: ['intl', 'nat', 'cultural'],
};

/** Locked AR display labels written into events.json `type`. */
export const EVENT_CATEGORY_TYPE_AR = {
  lecture: 'محاضرات علمية',
  visit: 'زيارات علمية',
  training: 'دورات تكوينية',
  study_day: 'أيام دراسية',
  intl: 'ملتقيات دولية',
  nat: 'ملتقيات وطنية',
  cultural: 'ملتقيات ثقافية',
};

/** Locked EN display labels for `type_en` when EN-ready. */
export const EVENT_CATEGORY_TYPE_EN = {
  lecture: 'Scientific lectures',
  visit: 'Scientific visits',
  training: 'Training courses',
  study_day: 'Study days',
  intl: 'International conferences',
  nat: 'National conferences',
  cultural: 'Cultural conferences',
};

/** i18n keys for chip / nav labels (data/locales). */
export const EVENT_CATEGORY_I18N = {
  lecture: 'ev_cat_lecture',
  visit: 'ev_cat_visit',
  training: 'ev_cat_training',
  study_day: 'ev_cat_study_day',
  intl: 'ev_cat_intl',
  nat: 'ev_cat_nat',
  cultural: 'ev_cat_cultural',
};

/** Old free-text `type` → category id (migration). */
export const LEGACY_TYPE_TO_CATEGORY = {
  'محاضرة علمية': 'lecture',
  'زيارات علمية': 'visit',
  'زيارة علمية': 'visit',
  'دورة تكوينية': 'training',
  'دورات تكوينية': 'training',
  'يوم دراسي': 'study_day',
  'أيام دراسية': 'study_day',
  'ملتقى وطني': 'nat',
  'ملتقيات وطنية': 'nat',
  'مؤتمر دولي': 'intl',
  'ملتقى دولي': 'intl',
  'مؤتمر علمي دولي': 'intl',
  'ملتقيات دولية': 'intl',
  'ملتقى ثقافي': 'cultural',
  'ملتقيات ثقافية': 'cultural',
  // Already-plural locked labels
  'محاضرات علمية': 'lecture',
};

/**
 * @param {string} categoryId
 * @returns {EventSectionId|null}
 */
export function sectionForCategory(categoryId) {
  if (EVENT_SECTION_CATEGORIES.activities.includes(/** @type {EventCategoryId} */ (categoryId))) {
    return 'activities';
  }
  if (EVENT_SECTION_CATEGORIES.meetings.includes(/** @type {EventCategoryId} */ (categoryId))) {
    return 'meetings';
  }
  return null;
}

/**
 * @param {string} [legacyType]
 * @param {'intl'|'nat'|string|null} [legacyScope]
 * @returns {EventCategoryId|null}
 */
export function resolveLegacyCategory(legacyType, legacyScope) {
  const raw = String(legacyType || '').trim();
  if (raw && LEGACY_TYPE_TO_CATEGORY[raw]) {
    return /** @type {EventCategoryId} */ (LEGACY_TYPE_TO_CATEGORY[raw]);
  }
  if (legacyScope === 'intl') return 'intl';
  if (legacyScope === 'nat') return 'nat';
  return null;
}

/**
 * Map legacy SPA/nav tab ids to section + optional chip.
 * @param {string} tabId
 * @returns {{ section: EventSectionId, category: EventCategoryId|'all' }}
 */
export function resolveEventsNavTab(tabId) {
  if (tabId === 'activities' || tabId === 'meetings') {
    return { section: tabId, category: 'all' };
  }
  if (tabId === 'intl') return { section: 'meetings', category: 'intl' };
  if (tabId === 'nat') return { section: 'meetings', category: 'nat' };
  return { section: 'activities', category: 'all' };
}
