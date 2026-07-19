/**
 * Focus trap / restore helpers for dialogs (drawer, lightbox).
 * No framework dependency — uses standard focusable selectors.
 */

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * @param {ParentNode} root
 * @returns {HTMLElement[]}
 */
export function getFocusable(root) {
  if (!root || !root.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return true;
  });
}

/**
 * Activate a focus trap inside `root`. Returns a release function.
 * @param {HTMLElement} root
 * @param {{ initialFocus?: HTMLElement|null, restoreFocus?: HTMLElement|null }} [opts]
 * @returns {() => void}
 */
export function trapFocus(root, opts = {}) {
  if (!root) return () => {};

  const previouslyFocused =
    opts.restoreFocus
    || (document.activeElement instanceof HTMLElement ? document.activeElement : null);

  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    const nodes = getFocusable(root);
    if (!nodes.length) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !root.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  root.addEventListener('keydown', onKeyDown);

  const initial = opts.initialFocus || getFocusable(root)[0] || root;
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
  requestAnimationFrame(() => {
    try { initial.focus(); } catch (_) { /* ignore */ }
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    root.removeEventListener('keydown', onKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try { previouslyFocused.focus(); } catch (_) { /* ignore */ }
    }
  };
}

/**
 * Prefer Escape closing the topmost open dialog only.
 * @param {Array<{ isOpen: () => boolean, close: () => void }>} stack
 */
export function handleEscapeStack(e, stack) {
  if (!e || e.key !== 'Escape') return;
  for (const item of stack) {
    if (item.isOpen()) {
      e.preventDefault();
      item.close();
      return;
    }
  }
}
