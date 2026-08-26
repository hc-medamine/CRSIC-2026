/**
 * Shared utility functions (throttle, debounce, DOM helpers, motion prefs, sanitizers).
 */

/** @returns {boolean} */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
export function throttle(fn, wait) {
  let last = 0;
  let timeout = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(fn, wait) {
  let timeout = null;
  return function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * @param {string} sel
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
export function qs(sel, root = document) {
  return root.querySelector(sel);
}

/**
 * @param {string} sel
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/**
 * Create an element with optional class, text, attrs, and children.
 * Text uses textContent (never parsed as HTML).
 * @param {string} tag
 * @param {{
 *   className?: string,
 *   text?: string,
 *   attrs?: Record<string, string|number|boolean|null|undefined>,
 *   style?: Record<string, string>,
 *   children?: (Node|null|undefined)[],
 * }} [opts]
 * @returns {HTMLElement}
 */
export function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text != null) node.textContent = String(opts.text);
  if (opts.attrs) {
    Object.entries(opts.attrs).forEach(([key, val]) => {
      if (val == null || val === false) return;
      if (val === true) node.setAttribute(key, '');
      else node.setAttribute(key, String(val));
    });
  }
  if (opts.style) {
    Object.entries(opts.style).forEach(([key, val]) => {
      if (val != null) node.style.setProperty(key, val);
    });
  }
  if (opts.children) {
    opts.children.forEach((child) => {
      if (child) node.appendChild(child);
    });
  }
  return node;
}

/** @param {Element} parent */
export function clearChildren(parent) {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
}

/**
 * Replace parent contents with nodes (DocumentFragment-friendly).
 * @param {Element} parent
 * @param {Node|Node[]} nodes
 */
export function replaceChildren(parent, nodes) {
  clearChildren(parent);
  const list = Array.isArray(nodes) ? nodes : [nodes];
  const frag = document.createDocumentFragment();
  list.forEach((n) => { if (n) frag.appendChild(n); });
  parent.appendChild(frag);
}

/**
 * Allow http(s) and relative URLs; block javascript:/data:/vbscript:.
 * @param {unknown} url
 * @returns {string}
 */
export function safeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return '';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * Image src: same rules as safeUrl (relative or http(s)).
 * @param {unknown} src
 * @returns {string}
 */
export function safeImageSrc(src) {
  return safeUrl(src);
}

/**
 * Pair a JPEG/PNG src with an optional WebP sibling. Missing/unsafe WebP → jpeg only.
 * @param {unknown} src
 * @param {unknown} webp
 * @returns {{ jpeg: string, webp: string }}
 */
export function resolvePictureSrcs(src, webp) {
  const jpeg = safeImageSrc(src);
  const webpSrc = safeImageSrc(webp);
  if (!jpeg) return { jpeg: '', webp: '' };
  if (!webpSrc || webpSrc === jpeg) return { jpeg, webp: '' };
  return { jpeg, webp: webpSrc };
}

/**
 * `<picture>` with WebP source + JPEG/PNG img, or a single img when WebP is missing.
 * No innerHTML. `display: contents` on picture so existing img CSS still matches.
 * @param {{
 *   src: unknown,
 *   webp?: unknown,
 *   alt?: string,
 *   className?: string,
 *   loading?: string,
 *   decoding?: string,
 *   style?: Record<string, string>,
 *   extraAttrs?: Record<string, string>,
 * }} opts
 * @returns {HTMLElement|null}
 */
export function cmsPictureEl(opts) {
  const { jpeg, webp } = resolvePictureSrcs(opts.src, opts.webp);
  if (!jpeg) return null;
  const img = el('img', {
    className: opts.className,
    style: opts.style,
    attrs: {
      src: jpeg,
      alt: opts.alt || '',
      loading: opts.loading || 'lazy',
      ...(opts.decoding ? { decoding: opts.decoding } : {}),
      ...(opts.extraAttrs || {}),
    },
  });
  if (!webp) return img;
  return el('picture', {
    className: 'cms-picture',
    children: [
      el('source', { attrs: { type: 'image/webp', srcset: webp } }),
      img,
    ],
  });
}

/**
 * Allow only linear-gradient(...) backgrounds from content JSON.
 * @param {unknown} bg
 * @returns {string}
 */
export function safeCssBackground(bg) {
  if (typeof bg !== 'string') return '';
  const trimmed = bg.trim();
  if (!/^linear-gradient\([^;{}<>]*\)$/i.test(trimmed)) return '';
  return trimmed;
}

/**
 * Apply trusted i18n HTML that may only contain `<br>` tags.
 * Falls back to textContent if other markup is present.
 * @param {Element} el
 * @param {string} html
 */
export function setTrustedBrHtml(el, html) {
  if (typeof html !== 'string') {
    el.textContent = '';
    return;
  }
  if (/<(?!br\s*\/?>)/i.test(html)) {
    el.textContent = html.replace(/<[^>]*>/g, '');
    return;
  }
  clearChildren(el);
  const parts = html.split(/<br\s*\/?>/i);
  parts.forEach((part, i) => {
    if (part) el.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) el.appendChild(document.createElement('br'));
  });
}
