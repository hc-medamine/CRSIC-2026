/**
 * Event list / year-group / home teaser — safe DOM builders (no innerHTML).
 */
import { cmsResponsiveSources } from '../data.js';
import { editorialCardAttrs, editorialField } from '../editorial.js';
import { eventResume } from '../featuredNews.js';
import { t } from '../i18n.js';
import { createPictureImg, el, safeImageSrc } from '../utils.js';
import { createContentByline } from './contentByline.js';

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

const EVENT_HOLDER_FALLBACK = [
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
function displayMonth(e) {
  const raw = String((e && e.month) || '').trim();
  return MONTH_DISPLAY_AR[raw] || raw;
}

/**
 * @param {object} e
 * @returns {string}
 */
function formatHomeEventDate(e) {
  const month = displayMonth(e);
  const year = (e && e.year) || '';
  const loc = t('home_event_loc');
  const left = [month, year].filter(Boolean).join(' ');
  return loc ? `${left} – ${loc}` : left;
}

/**
 * Readable caption date: day month year.
 * @param {object} e
 * @returns {string}
 */
function formatEvCardDate(e) {
  const day = String((e && e.day) || '').trim();
  const month = displayMonth(e);
  const year = String((e && e.year) || '').trim();
  return [day, month, year].filter(Boolean).join(' ');
}

/**
 * Stable holder index from slug/id.
 * @param {object} e
 * @returns {number}
 */
function holderIndexForEvent(e) {
  const key = String((e && (e.slug || e.id)) || '');
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h + key.charCodeAt(i) * (i + 1)) % 997;
  return h % EVENT_HOLDER_FALLBACK.length;
}

/**
 * @param {object} e
 * @param {string} title
 * @returns {{ fallback: string, webp: string }}
 */
function eventCardImageSources(e, title) {
  const sources = cmsResponsiveSources(e, 'card');
  if (sources.fallback) return sources;
  return {
    fallback: safeImageSrc(EVENT_HOLDER_FALLBACK[holderIndexForEvent(e)]) || EVENT_HOLDER_FALLBACK[0],
    webp: '',
  };
}

/**
 * @param {object} e
 * @param {string} title
 * @returns {HTMLElement|null}
 */
function createHomeEventVisual(e, title) {
  const sources = cmsResponsiveSources(e, 'card');
  const img = createPictureImg({
    fallbackSrc: sources.fallback,
    webpSrc: sources.webp,
    alt: title || '',
  });
  if (!img) return null;
  return el('div', {
    className: 'event-row-visual',
    children: [img],
  });
}

/**
 * Home-page upcoming event row — date badge on inline-start, text on inline-end.
 * Distinct from news photo cards and from the featured carousel.
 * @param {object} e
 * @param {number} [i=0]
 * @returns {HTMLElement}
 */
export function createHomeEventCard(e, i = 0) {
  const title = editorialField(e, 'title');
  const type = editorialField(e, 'label');
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

  const visual = createHomeEventVisual(e, title);

  return el('article', {
    className: 'event-row event-card--link',
    attrs: (e && (e.slug || e.id))
      ? {
          role: 'button',
          tabindex: 0,
          'data-lightbox-type': 'event',
          'data-lightbox-slug': e.slug || e.id,
          ...editorialCardAttrs(e),
        }
      : editorialCardAttrs(e),
    children: [
      el('div', {
        className: 'event-row-date',
        attrs: { 'aria-hidden': 'true' },
        children: [
          el('span', { className: 'event-row-day', text: (e && e.day) || '—' }),
          el('span', { className: 'event-row-month', text: displayMonth(e) }),
          el('span', { className: 'event-row-year', text: (e && e.year) || '' }),
        ],
      }),
      ...(visual ? [visual] : []),
      el('div', {
        className: 'event-row-body',
        children: [
          el('span', { className: badgeClass, text: badgeText }),
          el('div', { className: 'event-row-type', text: type }),
          el('div', { className: 'event-row-title', text: title }),
          createContentByline(e, { includeDate: false }),
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
 * Portfolio-style card for `#events` year lists (PRD 2026-09-14-spa-events-portfolio-cards).
 * @param {object} e
 * @returns {HTMLElement}
 */
export function createEvCard(e) {
  const status = (e && e.status) || 'upcoming';
  const title = editorialField(e, 'title');
  const type = editorialField(e, 'label');
  const resume = eventResume(e);
  const dateLine = formatEvCardDate(e);
  const sources = eventCardImageSources(e, title);

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

  const mediaImg = createPictureImg({
    fallbackSrc: sources.fallback,
    webpSrc: sources.webp,
    className: 'ev-card-img',
    alt: title || '',
  });

  const captionChildren = [
    el('div', { className: 'ev-card-date', text: dateLine }),
    el('div', { className: 'ev-type', text: type }),
    el('div', { className: 'ev-title', text: title }),
  ];
  if (resume) {
    captionChildren.push(el('p', { className: 'ev-resume', text: resume }));
  }
  captionChildren.push(createContentByline(e, { includeDate: false }), pill);

  const slug = e.slug || e.id || '';
  return el('div', {
    className: 'ev-card ev-card--link',
    attrs: slug
      ? {
          role: 'button',
          tabindex: 0,
          'data-lightbox-type': 'event',
          'data-lightbox-slug': slug,
          ...editorialCardAttrs(e),
        }
      : editorialCardAttrs(e),
    children: [
      el('div', {
        className: 'ev-card-media',
        attrs: { 'aria-hidden': 'true' },
        children: [
          mediaImg || el('div', { className: 'ev-card-media-fallback' }),
          el('div', { className: 'ev-card-media-overlay' }),
        ],
      }),
      el('div', {
        className: 'ev-body ev-card-caption',
        children: captionChildren,
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
          el('div', {
            className: 'ev-year-grid',
            children: groups[year].map(createEvCard),
          }),
        ],
      })
    );
}

/** @deprecated */
export const evCardHTML = createEvCard;
/** @deprecated */
export const groupEventsByYear = createEventYearGroups;
