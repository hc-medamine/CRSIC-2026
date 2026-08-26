/**
 * Laws & platforms catalog cards — native SPA hash details.
 */
import { cmsItemImageSrc, cmsItemWebpSrc } from '../data.js';
import { t, getLang } from '../i18n.js';
import { el, cmsPictureEl } from '../utils.js';

/**
 * @param {object} law
 * @returns {HTMLElement}
 */
export function createLawCard(law) {
  const lang = getLang();
  const title = lang === 'en' && law.titleEn ? law.titleEn : (law.title || '');
  const summary = lang === 'en' && law.summaryEn ? law.summaryEn : (law.summary || '');
  const img = cmsItemImageSrc(law);
  const slug = law.slug || law.id || '';
  const href = slug ? `#law/${encodeURIComponent(slug)}` : '#laws';
  const picture = img
    ? cmsPictureEl({
        src: img,
        webp: cmsItemWebpSrc(law),
        alt: title,
        loading: 'lazy',
      })
    : null;
  const media = picture
    ? el('div', {
        className: 'catalog-card-media',
        children: [picture],
      })
    : el('div', { className: 'catalog-card-media catalog-card-media--empty' });

  return el('a', {
    className: 'catalog-card',
    attrs: { href },
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
  const title = lang === 'en' && platform.titleEn ? platform.titleEn : (platform.title || '');
  const summary = lang === 'en' && platform.summaryEn ? platform.summaryEn : (platform.summary || '');
  const img = cmsItemImageSrc(platform);
  const slug = platform.slug || platform.id || '';
  const href = slug ? `#platform/${encodeURIComponent(slug)}` : '#platforms';

  const picture = img
    ? cmsPictureEl({
        src: img,
        webp: cmsItemWebpSrc(platform),
        alt: title,
        loading: 'lazy',
      })
    : null;
  const media = picture
    ? el('div', {
        className: 'catalog-card-media',
        children: [picture],
      })
    : el('div', { className: 'catalog-card-media catalog-card-media--empty' });

  const kindKey = platform.kind === 'radio'
    ? 'platform_kind_radio'
    : platform.kind === 'mobility'
      ? 'platform_kind_mobility'
      : 'platform_kind_visual';

  return el('a', {
    className: 'catalog-card',
    attrs: {
      href,
      'data-kind': platform.kind || 'visual',
    },
    children: [
      media,
      el('div', {
        className: 'catalog-card-body',
        children: [
          el('span', { className: 'catalog-card-kind', text: t(kindKey) }),
          el('h3', { className: 'catalog-card-title', text: title }),
          el('p', { className: 'catalog-card-summary', text: summary }),
          el('span', { className: 'catalog-card-cta', text: t('platforms_open') }),
        ],
      }),
    ],
  });
}
