/**
 * News card — safe DOM builder (no innerHTML).
 */
import { el, safeImageSrc } from '../utils.js';

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
 * @returns {HTMLElement}
 */
export function createNewsCard(n, i) {
  let thumb;
  const src = n.img ? safeImageSrc(n.img) : '';
  if (src) {
    thumb = el('img', {
      className: 'news-thumb',
      attrs: {
        src,
        alt: n.title || '',
        loading: 'lazy',
      },
    });
  } else {
    thumb = el('div', {
      className: 'news-thumb-placeholder',
      style: { background: GRADIENTS[i % 3] },
      children: [createPlaceholderSvg()],
    });
  }

  return el('article', {
    className: 'news-card',
    children: [
      thumb,
      el('div', {
        className: 'news-body',
        children: [
          el('div', { className: 'news-label', text: n.label || '' }),
          el('div', { className: 'news-title', text: n.title || '' }),
        ],
      }),
    ],
  });
}

/** @deprecated */
export const newsCardHTML = createNewsCard;
