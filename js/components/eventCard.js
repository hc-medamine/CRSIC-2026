/**
 * Event list / year-group — safe DOM builders (no innerHTML).
 */
import { t } from '../i18n.js';
import { el } from '../utils.js';

/**
 * @param {object} e
 * @returns {HTMLElement}
 */
export function createEvCard(e) {
  const pill = el('span', {
    className: e.status === 'done' ? 'ev-pill ev-pill-done' : 'ev-pill ev-pill-upcoming',
    text: e.status === 'done' ? t('ev_done_pill') : t('ev_upcoming_pill'),
  });

  return el('div', {
    className: 'ev-card',
    children: [
      el('div', {
        className: 'ev-date',
        children: [
          el('div', { className: 'ev-date-year', text: e.year || '' }),
          el('div', { className: 'ev-date-day', text: e.day || '' }),
          el('div', { className: 'ev-date-month', text: e.month || '' }),
        ],
      }),
      el('div', {
        className: 'ev-body',
        children: [
          el('div', { className: 'ev-type', text: e.type || '' }),
          el('div', { className: 'ev-title', text: e.title || '' }),
          pill,
        ],
      }),
    ],
  });
}

/**
 * @param {object[]} events
 * @returns {HTMLElement[]}
 */
export function createEventYearGroups(events) {
  const groups = {};
  (events || []).forEach((e) => {
    (groups[e.year] = groups[e.year] || []).push(e);
  });

  return Object.keys(groups)
    .sort((a, b) => b - a)
    .map((year) =>
      el('div', {
        className: 'ev-year-group',
        children: [
          el('div', { className: 'ev-year-label', text: year }),
          ...groups[year].map(createEvCard),
        ],
      })
    );
}

/** @deprecated */
export const evCardHTML = createEvCard;
/** @deprecated */
export const groupEventsByYear = createEventYearGroups;
