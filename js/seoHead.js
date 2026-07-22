/**
 * Per-item document title / meta description / OG tags for detail pages (PRD P1).
 * Falls back to site-wide i18n head when fields are empty or on leave-detail.
 */
import { getLang, t } from './i18n.js';

/**
 * @param {object|null|undefined} item
 * @param {'news'|'event'|'publication'} type
 */
export function applyItemSeoHead(item, type) {
  if (!item) return;
  const lang = getLang();
  const displayTitle =
    type === 'publication'
      ? item.t || ''
      : item.title || '';
  const displaySummary =
    type === 'publication'
      ? item.summary || item.desc || ''
      : item.summary || '';
  const displayImg =
    (Array.isArray(item.media) && item.media.find((m) => m && m.kind === 'image' && m.src)?.src) ||
    item.img ||
    null;

  const metaTitle =
    lang === 'en'
      ? item.meta_title_en || item.meta_title_ar || displayTitle
      : item.meta_title_ar || displayTitle;
  const metaDesc =
    lang === 'en'
      ? item.meta_description_en || item.meta_description_ar || displaySummary
      : item.meta_description_ar || displaySummary;
  const ogImage = item.og_image || displayImg || 'img/crsic_logo.png';

  if (metaTitle) document.title = metaTitle;

  const metaDescEl = document.querySelector('meta[name="description"]');
  if (metaDescEl && metaDesc) metaDescEl.setAttribute('content', metaDesc);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && metaTitle) ogTitle.setAttribute('content', metaTitle);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  if (metaDesc) ogDesc.setAttribute('content', metaDesc);

  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg && ogImage) ogImg.setAttribute('content', ogImage);
}

/** Restore site-wide title / description / OG from locale strings. */
export function restoreSiteSeoHead() {
  const title = t('doc_title');
  const desc = t('doc_description');
  if (title) document.title = title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && desc) metaDesc.setAttribute('content', desc);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && title) ogTitle.setAttribute('content', title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && desc) ogDesc.setAttribute('content', desc);
  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) ogImg.setAttribute('content', 'img/crsic_logo.png');
}
