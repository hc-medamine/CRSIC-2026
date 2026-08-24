/**
 * Home featured-news playlist: resolve ordered ids against live news.
 * Empty / all missing → newest fallback (PRD 2026-08-21-home-featured-news-playlist).
 */

import { editorialField } from './editorial.js';

export const FEATURED_NEWS_MAX = 10;
export const FEATURED_NEWS_FALLBACK = 3;

/**
 * @param {unknown} ids
 * @returns {string[]}
 */
export function normalizeFeaturedIds(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of ids) {
    const id = String(raw || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= FEATURED_NEWS_MAX) break;
  }
  return out;
}

/**
 * @param {object[]} news date-desc live catalog
 * @param {unknown} ids ordered playlist ids
 * @param {number} [fallbackLimit]
 * @returns {object[]}
 */
export function resolveFeaturedNews(news, ids, fallbackLimit = FEATURED_NEWS_FALLBACK) {
  const catalog = Array.isArray(news) ? news : [];
  const byId = new Map();
  const bySlug = new Map();
  for (const item of catalog) {
    if (!item) continue;
    const itemId = String(item.id || '');
    const slug = String(item.slug || '');
    if (itemId) byId.set(itemId, item);
    if (slug) bySlug.set(slug, item);
  }
  const ordered = [];
  const used = new Set();
  for (const id of normalizeFeaturedIds(ids)) {
    const item = byId.get(id) || bySlug.get(id);
    if (!item) continue;
    const key = String(item.id || item.slug || id);
    if (used.has(key)) continue;
    used.add(key);
    ordered.push(item);
  }
  if (ordered.length) return ordered;
  const n = Math.max(0, Number(fallbackLimit) || 0);
  return catalog.slice(0, n);
}

/**
 * Featured news teaser: summary, then stripped body. Respects EN-when-ready.
 * @param {object} item
 * @param {string} [lang]
 * @returns {string}
 */
export function newsResume(item, lang) {
  const summary = editorialField(item, 'summary', lang);
  if (summary) return summary;

  const body = String(editorialField(item, 'body', lang) || '')
    .replace(/\\n/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (body) {
    return body.length > 320 ? `${body.slice(0, 320).trim()}…` : body;
  }

  const label = editorialField(item, 'label', lang);
  const date = String((item && item.date) || '').trim();
  return [label, date].filter(Boolean).join(' — ');
}
