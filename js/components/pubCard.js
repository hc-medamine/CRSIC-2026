/**
 * Publication card — safe DOM builder (no innerHTML).
 */
import { pubCardImageSrc, pubCardWebpSrc } from '../data.js';
import { editorialCardAttrs, editorialField } from '../editorial.js';
import { t } from '../i18n.js';
import { el, cmsPictureEl } from '../utils.js';

/**
 * @param {object} p
 * @param {number} i
 * @returns {HTMLElement}
 */
export function createPubCard(p, i) {
  const cover = pubCardImageSrc(p, i);
  const badge = p.type === 'collective' ? t('badge_collective') : t('badge_individual');
  const title = editorialField(p, 'title');
  const dept = editorialField(p, 'label');

  const img = cover
    ? cmsPictureEl({
        src: cover,
        webp: pubCardWebpSrc(p, i),
        alt: title || '',
        loading: 'lazy',
        style: {
          width: '100%',
          height: '100%',
          'object-fit': 'cover',
          display: 'block',
        },
      })
    : el('div', { className: 'pub-cover-empty', attrs: { 'aria-hidden': 'true' } });

  const slug = p.slug || p.id || '';
  return el('article', {
    className: 'pub-card',
    attrs: {
      'data-type': p.type || '',
      'data-pub-index': i,
      role: 'button',
      tabindex: 0,
      ...editorialCardAttrs(p),
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
          el('div', { className: 'pub-meta-title', text: title || '' }),
          el('div', {
            className: 'pub-meta-bottom',
            children: [
              el('span', { className: 'pub-meta-dept', text: dept || '' }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** @deprecated Use createPubCard — kept name alias removed; callers updated. */
export const pubCardHTML = createPubCard;
