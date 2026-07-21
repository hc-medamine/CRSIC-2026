/**
 * Site configuration — content source and optional remote base URL.
 *
 * Local default: JSON under /data (relative to this module).
 * CDN / remote: set CONTENT_BASE_URL to a base that serves the same file names
 *   publications.json, events.json, partners.json, alerts.json, journals.json, news.json,
 *   site-copy.json (CMS-published static-pages overlay for about/cooperation/org/contact)
 *   and locales/ar.json, locales/en.json
 *
 * Examples:
 *   '' or omit → local ../data/
 *   'https://cdn.example.com/crsic/' → fetch https://cdn.example.com/crsic/publications.json
 *   'https://api.example.com/v1/content/' → same file names at that path
 *
 * Leave empty until a CDN/remote content base is connected. See data/CMS.md.
 */
export const CONTENT_BASE_URL = '';

/**
 * Resolve a content path to an absolute URL for fetch().
 * @param {string} relativePath e.g. 'publications.json' or 'locales/ar.json'
 * @param {string} [moduleUrl] import.meta.url of the calling module (for local fallback)
 * @returns {string}
 */
export function contentUrl(relativePath, moduleUrl = import.meta.url) {
  const base = typeof CONTENT_BASE_URL === 'string' ? CONTENT_BASE_URL.trim() : '';
  if (base) {
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return new URL(relativePath.replace(/^\//, ''), normalized).href;
  }
  // Local static files: js/config.js → ../data/<path>
  return new URL(`../data/${relativePath.replace(/^\//, '')}`, moduleUrl).href;
}
