/**
 * Public date + editor / reviewer / publisher block for news and event cards.
 */
import { getLang, t } from '../i18n.js';
import { el } from '../utils.js';

const PUBLISHER_FALLBACK = {
  ar: 'فريحة بوفاتح',
  en: 'Fariha Boufatah',
};

/**
 * @param {object} item
 * @param {'editor'|'reviewer'|'publisher'} role
 * @returns {string}
 */
export function bylineName(item, role) {
  const lang = getLang();
  const ar = String((item && item[`${role}_ar`]) || '').trim();
  const en = String((item && item[`${role}_en`]) || '').trim();
  const picked = lang === 'en' ? en || ar : ar || en;
  if (picked) return picked;
  if (role === 'publisher') return lang === 'en' ? PUBLISHER_FALLBACK.en : PUBLISHER_FALLBACK.ar;
  return '';
}

function creditName(item, role) {
  return {
    display: bylineName(item, role),
    ar: String((item && item[`${role}_ar`]) || '').trim(),
    en: String((item && item[`${role}_en`]) || '').trim(),
  };
}

function namesMatch(item, roleA, roleB) {
  const a = creditName(item, roleA);
  const b = creditName(item, roleB);
  if (a.display && a.display === b.display) return true;
  if (a.ar && a.ar === b.ar) return true;
  if (a.en && a.en === b.en) return true;
  return false;
}

function bylinePerson(roleKey, name) {
  return el('span', {
    className: 'card-byline-person',
    children: [
      el('span', { className: 'card-byline-role', text: t(roleKey) }),
      el('span', { className: 'card-byline-name', text: name }),
    ],
  });
}

/**
 * @param {string} iso YYYY-MM-DD
 * @returns {string}
 */
export function formatNewsDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  try {
    const d = new Date(`${iso}T12:00:00`);
    return new Intl.DateTimeFormat(getLang() === 'en' ? 'en-GB' : 'ar-DZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

/**
 * @param {object} item
 * @param {{ includeDate?: boolean }} [opts]
 * @returns {HTMLElement|null}
 */
export function createContentByline(item, opts = {}) {
  const includeDate = opts.includeDate !== false;
  const children = [];

  if (includeDate) {
    const iso = String((item && item.date) || '').trim();
    const label = formatNewsDate(iso);
    if (iso && label) {
      children.push(
        el('time', {
          className: 'card-byline-date',
          text: label,
          attrs: { datetime: iso },
        }),
      );
    }
  }

  const people = [];
  const editor = bylineName(item, 'editor');
  const reviewer = bylineName(item, 'reviewer');
  const publisher = bylineName(item, 'publisher');
  const sameReviewerPublisher = namesMatch(item, 'reviewer', 'publisher');

  if (editor) people.push(bylinePerson('byline_editor', editor));
  if (sameReviewerPublisher && (reviewer || publisher)) {
    people.push(bylinePerson('byline_reviewer_publisher', reviewer || publisher));
  } else {
    if (reviewer) people.push(bylinePerson('byline_reviewer', reviewer));
    if (publisher) people.push(bylinePerson('byline_publisher', publisher));
  }

  if (people.length) {
    children.push(el('div', { className: 'card-byline-people', children: people }));
  }
  if (!children.length) return null;
  return el('div', { className: 'card-byline', children });
}
