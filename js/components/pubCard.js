/**
 * Publication card — safe DOM builder (no innerHTML).
 */
import { getCover } from '../data.js';
import { t } from '../i18n.js';
import { el, safeImageSrc } from '../utils.js';

/**
 * @param {object} p
 * @param {number} i
 * @returns {HTMLElement}
 */
export function createPubCard(p, i) {
  const cover = safeImageSrc(getCover(i));
  const badge = p.type === 'collective' ? t('badge_collective') : t('badge_individual');

  const img = el('img', {
    attrs: {
      src: cover,
      alt: p.t || '',
      loading: 'lazy',
    },
    style: {
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
      display: 'block',
    },
  });

  const slug = p.slug || p.id || '';
  return el('article', {
    className: 'pub-card',
    attrs: {
      'data-type': p.type || '',
      'data-pub-index': i,
      role: 'button',
      tabindex: 0,
      ...(slug
        ? {
            'data-lightbox-type': 'publication',
            'data-lightbox-slug': slug,
          }
        : {}),
    },
    children: [
      el('div', {
        className: 'pub-cover',
        children: [
          img,
          el('span', { className: 'pub-cover-type-badge', text: badge }),
        ],
      }),
      el('div', {
        className: 'pub-meta',
        children: [
          el('div', { className: 'pub-meta-title', text: p.t || '' }),
          el('div', {
            className: 'pub-meta-bottom',
            children: [
              el('span', { className: 'pub-meta-dept', text: p.dept || '' }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** @deprecated Use createPubCard — kept name alias removed; callers updated. */
export const pubCardHTML = createPubCard;
