/**
 * Tiny bridge so cards can request the lightbox without importing ui.js
 * (ui.js mounts carousels that build cards — avoid a cycle).
 */

export const LIGHTBOX_OPEN_EVENT = 'crsic:lightbox-open';

/** @type {number} */
let openGuardUntil = 0;

/**
 * Block card→lightbox opens briefly after close so the same click cannot
 * fall through the overlay onto a news card underneath.
 * @param {number} [ms]
 */
export function armLightboxClickGuard(ms = 500) {
  openGuardUntil = Date.now() + Math.max(0, ms || 0);
}

/**
 * True while the overlay is open/closing, or during the post-close guard.
 * Underlying cards must not open another shadowbox in these states.
 * @returns {boolean}
 */
export function isLightboxOpenRequestBlocked() {
  if (typeof document !== 'undefined') {
    const lb = document.getElementById('lightbox');
    if (lb && (lb.classList.contains('open') || lb.classList.contains('is-closing'))) {
      return true;
    }
  }
  return Date.now() < openGuardUntil;
}

/**
 * @param {{ type: string, slug?: string, index?: number, triggerEl?: HTMLElement|null }} detail
 */
export function requestLightboxOpen(detail) {
  if (typeof document === 'undefined') return;
  if (isLightboxOpenRequestBlocked()) return;
  document.dispatchEvent(
    new CustomEvent(LIGHTBOX_OPEN_EVENT, {
      detail: detail || {},
      bubbles: true,
    }),
  );
}
