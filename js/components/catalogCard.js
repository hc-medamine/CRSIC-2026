/**
 * Laws & platforms catalog cards — native SPA hash details.
 */
import { cmsResponsiveSources } from '../data.js';
import { editorialCardAttrs, editorialField } from '../editorial.js';
import { t, getLang } from '../i18n.js';
import { createPictureImg, el } from '../utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Brand green-gold scales mark for catalog cards without a dedicated cover
 * (PRD 2026-09-15 laws/platforms empty mark).
 * @returns {SVGSVGElement}
 */
function catalogScalesMark() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'catalog-card-scales');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const green = document.createElementNS(SVG_NS, 'g');
  green.setAttribute('class', 'catalog-card-scales-green');
  green.setAttribute('fill', 'none');
  green.setAttribute('stroke', 'currentColor');
  green.setAttribute('stroke-width', '2.5');
  green.setAttribute('stroke-linecap', 'round');
  green.setAttribute('stroke-linejoin', 'round');

  const pole = document.createElementNS(SVG_NS, 'path');
  /* Stem starts at the beam — never above it (avoids a cross silhouette). */
  pole.setAttribute('d', 'M32 16v30');
  const beam = document.createElementNS(SVG_NS, 'path');
  beam.setAttribute('d', 'M14 16h36');
  const leftChain = document.createElementNS(SVG_NS, 'path');
  leftChain.setAttribute('d', 'M14 16l-6 14M14 16l6 14');
  const rightChain = document.createElementNS(SVG_NS, 'path');
  rightChain.setAttribute('d', 'M50 16l-6 14M50 16l6 14');
  const base = document.createElementNS(SVG_NS, 'path');
  base.setAttribute('d', 'M22 52h20M26 46h12v6');

  green.appendChild(pole);
  green.appendChild(beam);
  green.appendChild(leftChain);
  green.appendChild(rightChain);
  green.appendChild(base);

  const gold = document.createElementNS(SVG_NS, 'g');
  gold.setAttribute('class', 'catalog-card-scales-gold');
  gold.setAttribute('fill', 'currentColor');

  const pivot = document.createElementNS(SVG_NS, 'circle');
  pivot.setAttribute('cx', '32');
  pivot.setAttribute('cy', '16');
  pivot.setAttribute('r', '2.75');

  const leftPan = document.createElementNS(SVG_NS, 'path');
  leftPan.setAttribute('d', 'M8 30h12l-2 5H10z');
  const rightPan = document.createElementNS(SVG_NS, 'path');
  rightPan.setAttribute('d', 'M44 30h12l-2 5H46z');

  gold.appendChild(pivot);
  gold.appendChild(leftPan);
  gold.appendChild(rightPan);

  svg.appendChild(green);
  svg.appendChild(gold);
  return svg;
}

/**
 * @param {object} sources
 * @param {string} title
 * @returns {HTMLElement}
 */
function catalogMedia(sources, title) {
  const imgEl = sources.fallback
    ? createPictureImg({
        fallbackSrc: sources.fallback,
        webpSrc: sources.webp,
        alt: title,
      })
    : null;
  if (imgEl) {
    return el('div', { className: 'catalog-card-media', children: [imgEl] });
  }
  return el('div', {
    className: 'catalog-card-media catalog-card-media--empty',
    children: [catalogScalesMark()],
  });
}

/**
 * @param {object} law
 * @returns {HTMLElement}
 */
export function createLawCard(law) {
  const lang = getLang();
  const title = editorialField(law, 'title', lang);
  const summary = editorialField(law, 'summary', lang);
  const sources = cmsResponsiveSources(law, 'card');
  const slug = law.slug || law.id || '';
  const href = slug ? `#law/${encodeURIComponent(slug)}` : '#laws';
  const cardAttrs = editorialCardAttrs(law, lang);

  return el('a', {
    className: 'catalog-card',
    attrs: { href, ...cardAttrs },
    children: [
      catalogMedia(sources, title),
      el('div', {
        className: 'catalog-card-body',
        children: [
          el('h3', { className: 'catalog-card-title', text: title }),
          el('p', { className: 'catalog-card-summary', text: summary }),
          el('span', { className: 'catalog-card-cta', text: t('laws_open_link') }),
        ],
      }),
    ],
  });
}

/**
 * @param {object} platform
 * @returns {HTMLElement}
 */
export function createPlatformCard(platform) {
  const lang = getLang();
  const title = editorialField(platform, 'title', lang);
  const summary = editorialField(platform, 'summary', lang);
  const sources = cmsResponsiveSources(platform, 'card');
  const slug = platform.slug || platform.id || '';
  const href = slug ? `#platform/${encodeURIComponent(slug)}` : '#platforms';
  const cardAttrs = editorialCardAttrs(platform, lang);

  return el('a', {
    className: 'catalog-card',
    attrs: { href, ...cardAttrs },
    children: [
      catalogMedia(sources, title),
      el('div', {
        className: 'catalog-card-body',
        children: [
          el('h3', { className: 'catalog-card-title', text: title }),
          el('p', { className: 'catalog-card-summary', text: summary }),
          el('span', { className: 'catalog-card-cta', text: t('platforms_open') }),
        ],
      }),
    ],
  });
}
