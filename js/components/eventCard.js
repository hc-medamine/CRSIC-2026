/**
 * Event list / year-group / home teaser — safe DOM builders (no innerHTML).
 */
import { t } from '../i18n.js';
import { el, safeImageSrc } from '../utils.js';

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

const THUMB_BG = ['event-thumb-bg1', 'event-thumb-bg2', 'event-thumb-bg3'];
const HOLDER_FALLBACK = [
  'img/Holders/0.jpg',
  'img/Holders/1.jpg',
  'img/Holders/2.jpg',
  'img/Holders/3.jpg',
  'img/Holders/4.jpg',
  'img/Holders/5.jpg',
];

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
 * Home-page event teaser card (photo thumb + meta).
 * Optional `e.img`; otherwise cycles Holders photos.
 * @param {object} e
 * @param {number} [i=0]
 * @returns {HTMLElement}
 */
export function createHomeEventCard(e, i = 0) {
  const title = (e && e.title) || '';
  const type = (e && e.type) || '';
  const done = !e || e.status !== 'upcoming';
  const imgSrc = safeImageSrc((e && e.img) || HOLDER_FALLBACK[i % HOLDER_FALLBACK.length] || '');

  const thumbChildren = [];
  if (imgSrc) {
    thumbChildren.push(el('img', {
      attrs: { src: imgSrc, alt: title, loading: 'lazy' },
    }));
  }
  thumbChildren.push(
    el('span', {
      className: done ? 'event-badge event-badge-past' : 'event-badge event-badge-upcoming',
      text: done ? t('ev_badge_done') : t('ev_badge_upcoming'),
    }),
    el('div', { className: 'event-thumb-label', text: type ? `${type}: ${title}` : title }),
  );

  return el('article', {
    className: 'event-card event-card--link',
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
        className: `event-thumb ${THUMB_BG[i % THUMB_BG.length]}`,
        children: thumbChildren,
      }),
      el('div', {
        className: 'event-info',
        children: [
          el('div', { className: 'event-type', text: type }),
          el('div', { className: 'event-title', text: title }),
          el('div', {
            className: 'event-footer-row',
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
  const pill = el('span', {
    className: e.status === 'done' ? 'ev-pill ev-pill-done' : 'ev-pill ev-pill-upcoming',
    text: e.status === 'done' ? t('ev_done_pill') : t('ev_upcoming_pill'),
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
