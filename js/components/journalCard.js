/**
 * Journal card — safe DOM builder (no innerHTML).
 */
import { t } from '../i18n.js';
import { el, safeCssBackground, safeUrl } from '../utils.js';

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

  return el('div', {
    className: 'journal-card',
    children: [
      cover,
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
    ],
  });
}

/** @deprecated */
export const journalCardHTML = createJournalCard;
