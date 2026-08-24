/**
 * Partner card — safe DOM builder (no innerHTML).
 */
import { cmsCardImageSrc } from '../data.js';
import { editorialCardAttrs, editorialField } from '../editorial.js';
import { el, safeImageSrc } from '../utils.js';

/**
 * @param {object} p
 * @returns {HTMLElement}
 */
export function createPartnerCard(p) {
  const slug = p.slug || p.id;
  const imgSrc = safeImageSrc(cmsCardImageSrc(p));
  const name = editorialField(p, 'name');
  const summary = editorialField(p, 'summary');
  const mark = imgSrc
    ? el('div', {
        className: 'partner-mark partner-mark-img',
        children: [
          el('img', {
            attrs: { src: imgSrc, alt: name || '', loading: 'lazy' },
          }),
        ],
      })
    : el('div', { className: 'partner-mark', text: p.emoji || '' });

  const body = el('div', {
    children: [
      el('div', { className: 'partner-name', text: name || '' }),
      el('div', { className: 'partner-country', text: p.country || '' }),
      el('div', { className: 'partner-date', text: p.date || '' }),
      summary
        ? el('p', { className: 'partner-summary', text: summary })
        : null,
    ].filter(Boolean),
  });

  const cardAttrs = editorialCardAttrs(p);
  if (slug) {
    return el('a', {
      className: 'partner-card partner-card-link',
      attrs: { href: `#partner/${encodeURIComponent(slug)}`, ...cardAttrs },
      children: [mark, body],
    });
  }

  return el('div', {
    className: 'partner-card',
    attrs: cardAttrs,
    children: [mark, body],
  });
}

/** @deprecated */
export const partnerCardHTML = createPartnerCard;
