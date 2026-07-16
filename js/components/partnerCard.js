/**
 * Partner card — safe DOM builder (no innerHTML).
 */
import { el } from '../utils.js';

/**
 * @param {object} p
 * @returns {HTMLElement}
 */
export function createPartnerCard(p) {
  return el('div', {
    className: 'partner-card',
    children: [
      el('div', { className: 'partner-mark', text: p.emoji || '' }),
      el('div', {
        children: [
          el('div', { className: 'partner-name', text: p.name || '' }),
          el('div', { className: 'partner-country', text: p.country || '' }),
          el('div', { className: 'partner-date', text: p.date || '' }),
        ],
      }),
    ],
  });
}

/** @deprecated */
export const partnerCardHTML = createPartnerCard;
