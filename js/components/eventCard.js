/**
 * Event list / year-group / home teaser — safe DOM builders (no innerHTML).
 */
import { t } from '../i18n.js';
import { el } from '../utils.js';

/** Short month labels in events.json → longer Arabic display for home cards. */
const MONTH_DISPLAY_AR = {
  يان: 'يناير', ينا: 'يناير', جان: 'يناير',
  فيف: 'فبراير', فبر: 'فبراير',
  مار: 'مارس', مارس: 'مارس',
  أفر: 'أفريل', افر: 'أفريل', أبر: 'أبريل',
  ماي: 'ماي', مايو: 'مايو',
  جون: 'جوان', يون: 'يونيو',
  جوي: 'جويلية', يول: 'يوليو',
  أوت: 'أوت', اوت: 'أوت', أغس: 'أغسطس',
  سبت: 'سبتمبر', سبتمبر: 'سبتمبر',
  أكت: 'أكتوبر', اكت: 'أكتوبر', أكتو: 'أكتوبر',
  نوف: 'نوفمبر',
  ديس: 'ديسمبر',
};

/**
 * @param {object} e
 * @returns {string}
 */
function formatHomeEventDate(e) {
  const rawMonth = String((e && e.month) || '').trim();
  const month = MONTH_DISPLAY_AR[rawMonth] || rawMonth;
  const year = (e && e.year) || '';
  const loc = t('home_event_loc');
  const left = [month, year].filter(Boolean).join(' ');
  return loc ? `${left} – ${loc}` : left;
}

/**
 * Home-page upcoming event row — date badge on inline-start, text on inline-end.
 * Distinct from news photo cards and from the featured carousel.
 * @param {object} e
 * @param {number} [i=0]
 * @returns {HTMLElement}
 */
export function createHomeEventCard(e, i = 0) {
  const title = (e && e.title) || '';
  const type = (e && e.type) || '';
  const status = (e && e.status) || 'upcoming';
  const badgeClass =
    status === 'ongoing'
      ? 'event-badge event-badge-ongoing'
      : status === 'upcoming'
        ? 'event-badge event-badge-upcoming'
        : 'event-badge event-badge-past';
  const badgeText =
    status === 'ongoing'
      ? t('ev_badge_ongoing')
      : status === 'upcoming'
        ? t('ev_badge_upcoming')
        : t('ev_badge_done');

  return el('article', {
    className: 'event-row event-card--link',
    attrs: (e && (e.slug || e.id))
      ? {
          role: 'button',
          tabindex: 0,
          'data-lightbox-type': 'event',
          'data-lightbox-slug': e.slug || e.id,
        }
      : {},
    children: [
      el('div', {
        className: 'event-row-date',
        attrs: { 'aria-hidden': 'true' },
        children: [
          el('span', { className: 'event-row-day', text: (e && e.day) || '—' }),
          el('span', { className: 'event-row-month', text: (e && e.month) || '' }),
          el('span', { className: 'event-row-year', text: (e && e.year) || '' }),
        ],
      }),
      el('div', {
        className: 'event-row-body',
        children: [
          el('span', { className: badgeClass, text: badgeText }),
          el('div', { className: 'event-row-type', text: type }),
          el('div', { className: 'event-row-title', text: title }),
          el('div', {
            className: 'event-row-meta',
            children: [
              el('span', { className: 'event-date', text: formatHomeEventDate(e) }),
              el('span', {
                className: 'event-album-link',
                children: [
                  el('span', { className: 'event-album-dot' }),
                  el('span', { text: t('ev_details') }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {object} e
 * @returns {HTMLElement}
 */
export function createEvCard(e) {
  const status = (e && e.status) || 'upcoming';
  const pill = el('span', {
    className:
      status === 'done'
        ? 'ev-pill ev-pill-done'
        : status === 'ongoing'
          ? 'ev-pill ev-pill-ongoing'
          : 'ev-pill ev-pill-upcoming',
    text:
      status === 'done'
        ? t('ev_done_pill')
        : status === 'ongoing'
          ? t('ev_badge_ongoing')
          : t('ev_upcoming_pill'),
  });

  const slug = e.slug || e.id || '';
  return el('div', {
    className: 'ev-card ev-card--link',
    attrs: slug
      ? {
          role: 'button',
          tabindex: 0,
          'data-lightbox-type': 'event',
          'data-lightbox-slug': slug,
        }
      : {},
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
