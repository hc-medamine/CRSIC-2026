/**
 * Laws & platforms catalog cards — native SPA hash details.
 */
import { cmsResponsiveSources } from '../data.js';
import { editorialCardAttrs, editorialField } from '../editorial.js';
import { t, getLang } from '../i18n.js';
import { createPictureImg, el } from '../utils.js';

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
  const imgEl = sources.fallback
    ? createPictureImg({
        fallbackSrc: sources.fallback,
        webpSrc: sources.webp,
        alt: title,
      })
    : null;
  const media = imgEl
    ? el('div', { className: 'catalog-card-media', children: [imgEl] })
    : el('div', { className: 'catalog-card-media catalog-card-media--empty' });

  return el('a', {
    className: 'catalog-card',
    attrs: { href, ...cardAttrs },
    children: [
      media,
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
  const imgEl = sources.fallback
    ? createPictureImg({
        fallbackSrc: sources.fallback,
        webpSrc: sources.webp,
        alt: title,
      })
    : null;
  const media = imgEl
    ? el('div', { className: 'catalog-card-media', children: [imgEl] })
    : el('div', { className: 'catalog-card-media catalog-card-media--empty' });

  return el('a', {
    className: 'catalog-card',
    attrs: { href, ...cardAttrs },
    children: [
      media,
      el('div', {
        className: 'catalog-card-body',
        children: [
          el('h3', { className: 'catalog-card-title', text: title }),
          el('p', { className: 'catalog-card-summary', text: summary }),
          el('span', { className: 'catalog-card-cta', text: t('platforms_open_link') }),
        ],
      }),
    ],
  });
}
