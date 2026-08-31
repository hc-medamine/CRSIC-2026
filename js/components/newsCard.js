/**
 * News card — safe DOM builder (no innerHTML).
 */
import { cmsCardImageSrc, cmsResponsiveSources } from '../data.js';
import { editorialCardAttrs, editorialField } from '../editorial.js';
import { el, createPictureImg } from '../utils.js';
import { createContentByline } from './contentByline.js';

const GRADIENTS = [
  'linear-gradient(135deg,#1B4332,#2D6A4F)',
  'linear-gradient(135deg,#1A2A4A,#2B4480)',
  'linear-gradient(135deg,#3D2B1F,#6B4226)',
];

/**
 * Decorative hex placeholder (static SVG, no user content).
 * @returns {SVGSVGElement}
 */
function createPlaceholderSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '32');
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('fill', 'none');

  const poly = document.createElementNS(NS, 'polygon');
  poly.setAttribute('points', '14,2 26,8 26,20 14,26 2,20 2,8');
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', '#C9A84C');
  poly.setAttribute('stroke-width', '1');

  const circle = document.createElementNS(NS, 'circle');
  circle.setAttribute('cx', '14');
  circle.setAttribute('cy', '14');
  circle.setAttribute('r', '4');
  circle.setAttribute('fill', '#C9A84C');
  circle.setAttribute('opacity', '0.4');

  svg.appendChild(poly);
  svg.appendChild(circle);
  return svg;
}

/**
 * @param {object} n
 * @param {number} i
 * @param {{ linkToDetail?: boolean }} [opts]
 * @returns {HTMLElement}
 */
export function createNewsCard(n, i, opts = {}) {
  const { linkToDetail = false } = opts;
  let mediaChild;
  const title = editorialField(n, 'title');
  const label = editorialField(n, 'label');
  const sources = cmsResponsiveSources(n, 'card');
  if (sources.fallback) {
    mediaChild = createPictureImg({
      fallbackSrc: sources.fallback,
      webpSrc: sources.webp,
      className: 'news-thumb',
      alt: title || '',
    });
  } else {
    mediaChild = el('div', {
      className: 'news-thumb-placeholder',
      style: { background: GRADIENTS[i % 3] },
      children: [createPlaceholderSvg()],
    });
  }

  const slug = n.slug || n.id || '';
  const year = String(n.date || '').slice(0, 4);
  const haystack = [title, label, editorialField(n, 'summary'), n.editor_ar, n.editor_en, n.reviewer_ar, n.date]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const byline = createContentByline(n, { includeDate: true });
  const cardAttrs = editorialCardAttrs(n);

  const body = el('div', {
    className: 'news-body',
    children: [
      el('div', { className: 'news-label', text: label || '' }),
      el('div', { className: 'news-title card-title', text: title || '' }),
      byline,
    ].filter(Boolean),
  });

  const inner = [
    el('div', { className: 'card-media', children: [mediaChild] }),
    body,
  ];

  if (linkToDetail && slug) {
    return el('a', {
      className: 'news-card news-card--link',
      attrs: {
        href: `#news/${encodeURIComponent(slug)}`,
        'data-year': /^\d{4}$/.test(year) ? year : '',
        'data-q': haystack,
        ...cardAttrs,
      },
      children: inner,
    });
  }

  return el('article', {
    className: 'news-card news-card--link',
    attrs: slug
      ? {
          role: 'button',
          tabindex: 0,
          'data-lightbox-type': 'news',
          'data-lightbox-slug': slug,
          'data-year': /^\d{4}$/.test(year) ? year : '',
          'data-q': haystack,
          ...cardAttrs,
        }
      : {
          'data-year': /^\d{4}$/.test(year) ? year : '',
          'data-q': haystack,
          ...cardAttrs,
        },
    children: inner,
  });
}

/** @deprecated */
export const newsCardHTML = createNewsCard;
