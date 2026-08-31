/**
 * Public editorial EN: show filled EN fields only when en_status is ready.
 * Missing or non-ready → Arabic. Never invents translations.
 */
import { getLang } from './i18n.js';

/**
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function isEditorialEnReady(item) {
  return Boolean(item && item.en_status === 'ready');
}

/**
 * @param {object} item
 * @param {'title'|'summary'|'body'|'label'|'name'} field
 * @returns {string}
 */
function arValue(item, field) {
  if (field === 'title') {
    return String(item.title || item.t || item.name || item.title_ar || '').trim();
  }
  if (field === 'summary') {
    return String(item.summary || item.desc || item.summary_ar || '').trim();
  }
  if (field === 'body') return String(item.body || item.body_ar || item.dibaja_ar || '').trim();
  if (field === 'label') return String(item.label || item.type || item.dept || '').trim();
  if (field === 'name') {
    return String(item.name || item.name_ar || item.title || item.title_ar || '').trim();
  }
  if (field === 'message') return String(item.message_ar || item.message || '').trim();
  if (field === 'lead') return String(item.lead_ar || item.research_lead_ar || '').trim();
  if (field === 'questions') {
    return String(item.questions_ar || item.research_questions_ar || '').trim();
  }
  if (field === 'duration') {
    return String(item.duration_ar || item.research_duration_ar || '').trim();
  }
  if (field === 'link_label') return String(item.link_label_ar || '').trim();
  return '';
}

/**
 * @param {object} item
 * @param {'title'|'summary'|'body'|'label'|'name'} field
 * @returns {string}
 */
function enValue(item, field) {
  if (field === 'title') return String(item.title_en || '').trim();
  if (field === 'summary') return String(item.summary_en || '').trim();
  if (field === 'body') return String(item.body_en || item.dibaja_en || '').trim();
  if (field === 'label') return String(item.label_en || item.type_en || '').trim();
  if (field === 'name') return String(item.name_en || item.title_en || '').trim();
  if (field === 'message') return String(item.message_en || '').trim();
  if (field === 'lead') return String(item.lead_en || '').trim();
  if (field === 'questions') return String(item.questions_en || '').trim();
  if (field === 'duration') return String(item.duration_en || '').trim();
  if (field === 'link_label') return String(item.link_label_en || '').trim();
  return '';
}

/**
 * @param {object|null|undefined} item
 * @param {'title'|'summary'|'body'|'label'|'name'} field
 * @param {string} [lang]
 * @returns {string}
 */
export function editorialField(item, field, lang = getLang()) {
  if (!item) return '';
  const ar = arValue(item, field);
  if (lang !== 'en' || !isEditorialEnReady(item)) return ar;
  return enValue(item, field) || ar;
}

/**
 * Card/list attrs: mark ready so section notices can hide when every visible item is ready.
 * @param {object|null|undefined} item
 * @param {string} [lang]
 * @returns {Record<string, string>}
 */
export function editorialCardAttrs(item, lang = getLang()) {
  const ready = isEditorialEnReady(item);
  /** @type {Record<string, string>} */
  const attrs = { 'data-en-ready': ready ? '1' : '0' };
  if (lang === 'en') attrs.lang = ready ? 'en' : 'ar';
  return attrs;
}

/**
 * Bilingual list entry (research axes/impacts/members) gated by parent en_status.
 * @param {object|null|undefined} entry
 * @param {object|null|undefined} parentItem
 * @param {string} [lang]
 * @returns {string}
 */
export function editorialBilingualEntry(entry, parentItem, lang = getLang()) {
  if (!entry) return '';
  const ar = String(entry.ar || entry.name_ar || '').trim();
  if (lang !== 'en' || !isEditorialEnReady(parentItem)) return ar;
  return String(entry.en || entry.name_en || '').trim() || ar;
}

/**
 * @param {object|null|undefined} item
 * @param {string} [lang]
 * @returns {Record<string, string>}
 */
export function editorialLangAttrs(item, lang = getLang()) {
  if (lang !== 'en') return {};
  return isEditorialEnReady(item) ? {} : { lang: 'ar' };
}
