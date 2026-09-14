/**
 * Journal card — safe DOM builder (no innerHTML).
 * Gradient identity kept; optional cover shelf appended between cover band and body.
 */
import { t } from '../i18n.js';
import { el, safeCssBackground, safeUrl, safeImageSrc } from '../utils.js';

/**
 * @param {object} cover
 * @param {string} fallbackUrl
 * @param {number} index
 * @returns {HTMLElement|null}
 */
function createShelfCover(cover, fallbackUrl, index) {
  const src = safeImageSrc(cover?.src);
  if (!src) return null;
  const href = safeUrl(cover?.url) || safeUrl(fallbackUrl) || '#';
  const img = el('img', {
    className: 'journal-shelf-img',
    attrs: {
      src,
      alt: cover?.alt || '',
      loading: 'lazy',
      decoding: 'async',
    },
  });
  return el('a', {
    className: 'journal-shelf-item',
    attrs: {
      href,
      target: '_blank',
      rel: 'noopener',
      role: 'listitem',
    },
    style: { '--shelf-i': String(index) },
    children: [img],
  });
}

/**
 * @param {object} j
 * @returns {HTMLElement}
 */
export function createJournalCard(j) {
  const bg = safeCssBackground(j.bg);
  const href = safeUrl(j.url) || '#';

  const cover = el('div', {
    className: 'journal-cover',
    children: [
      el('div', { className: 'journal-cover-freq', text: j.freq || '' }),
      el('div', { className: 'journal-cover-name', text: j.name || '' }),
      el('div', {
        className: 'journal-cover-langs',
        text: `${t('journal_langs_label')} ${j.langs || ''}`,
      }),
    ],
  });
  if (bg) cover.style.background = bg;

  const children = [cover];

  const coverList = Array.isArray(j.covers) ? j.covers : [];
  const shelfItems = coverList
    .map((c, i) => createShelfCover(c, j.url, i))
    .filter(Boolean)
    .slice(0, 4);

  if (shelfItems.length) {
    children.push(
      el('div', {
        className: 'journal-shelf',
        attrs: { role: 'list' },
        children: shelfItems,
      }),
    );
  }

  children.push(
    el('div', {
      className: 'journal-body',
      children: [
        el('p', { className: 'journal-desc', text: j.desc || '' }),
        el('a', {
          className: 'journal-btn',
          text: t('journal_access_btn'),
          attrs: {
            href,
            target: '_blank',
            rel: 'noopener',
          },
        }),
      ],
    }),
  );

  return el('div', {
    className: 'journal-card',
    children,
  });
}

/** @deprecated */
export const journalCardHTML = createJournalCard;
