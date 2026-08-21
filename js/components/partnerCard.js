/**
 * Partner card — safe DOM builder (no innerHTML).
 */
import { cmsItemImageSrc } from '../data.js';
import { el, safeImageSrc } from '../utils.js';

/**
 * @param {object} p
 * @returns {HTMLElement}
 */
export function createPartnerCard(p) {
  const slug = p.slug || p.id;
  const imgSrc = safeImageSrc(cmsItemImageSrc(p));
  const mark = imgSrc
    ? el('div', {
        className: 'partner-mark partner-mark-img',
        children: [
          el('img', {
            attrs: { src: imgSrc, alt: p.name || '', loading: 'lazy' },
          }),
        ],
      })
    : el('div', { className: 'partner-mark', text: p.emoji || '' });

  const summary = (p.summary_ar || '').trim();
  const body = el('div', {
    children: [
      el('div', { className: 'partner-name', text: p.name || '' }),
      el('div', { className: 'partner-country', text: p.country || '' }),
      el('div', { className: 'partner-date', text: p.date || '' }),
      summary
        ? el('p', { className: 'partner-summary', text: summary })
        : null,
    ].filter(Boolean),
  });

  if (slug) {
    return el('a', {
      className: 'partner-card partner-card-link',
      attrs: { href: `#partner/${encodeURIComponent(slug)}` },
      children: [mark, body],
    });
  }

  return el('div', {
    className: 'partner-card',
    children: [mark, body],
  });
}

/** @deprecated */
export const partnerCardHTML = createPartnerCard;
