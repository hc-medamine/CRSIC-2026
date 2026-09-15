/**
 * Home featured playlist: resolve typed news|event entries (PRD 2026-09-15).
 * Empty / all missing → newest mix of news+events **with images** (top 10 by date).
 */

import { editorialField } from './editorial.js';

export const FEATURED_NEWS_MAX = 10;
/** Empty live playlist → merge catalogs by date, take this many (image-bearing only). */
export const FEATURED_NEWS_FALLBACK = 10;

/**
 * True when the item has a usable cover for the Home featured strip
 * (same fields as `cmsCardImageSrc` / `cmsItemImageSrc`).
 * @param {object|undefined} item
 * @returns {boolean}
 */
export function hasFeaturedImage(item) {
  if (!item || typeof item !== 'object') return false;
  if (String(item.img_card || '').trim()) return true;
  if (Array.isArray(item.media)) {
    const fromMedia = item.media.find((m) => m && m.kind === 'image' && m.src);
    if (fromMedia && String(fromMedia.src || '').trim()) return true;
  }
  return Boolean(
    String(item.img || item.cover || item.og_image || '').trim(),
  );
}

/**
 * @typedef {{ type: 'news'|'event', id: string }} FeaturedItem
 */

/** Arabic month abbreviations used in events.json → sort rank (1–12). */
const MONTH_RANK = {
  يان: 1, ينا: 1, جان: 1,
  فيف: 2, فبر: 2,
  مار: 3, مارس: 3,
  أفر: 4, افر: 4, أبر: 4,
  ماي: 5, مايو: 5,
  جون: 6, يون: 6,
  جوي: 7, يول: 7,
  أوت: 8, اوت: 8, أغس: 8,
  سبت: 9, سبتمبر: 9,
  أكت: 10, اكت: 10, أكتو: 10,
  نوف: 11,
  ديس: 12,
};

/**
 * @param {object} e
 * @returns {number}
 */
export function featuredEventSortKey(e) {
  const y = parseInt(e && e.year, 10) || 0;
  const m = MONTH_RANK[String((e && e.month) || '').trim()] || 0;
  const d = parseInt(e && e.day, 10) || 0;
  return y * 10000 + m * 100 + d;
}

/**
 * @param {object} n
 * @returns {number}
 */
export function featuredNewsSortKey(n) {
  const raw = String((n && n.date) || '').trim().slice(0, 10);
  const parts = raw.split('-').map((p) => parseInt(p, 10) || 0);
  const y = parts[0] || 0;
  const m = parts[1] || 0;
  const d = parts[2] || 0;
  return y * 10000 + m * 100 + d;
}

/**
 * Accept `{ items }`, legacy `{ ids }` / bare id arrays (→ news).
 * @param {unknown} data
 * @returns {FeaturedItem[]}
 */
export function normalizeFeaturedItems(data) {
  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const obj = /** @type {{ items?: unknown, ids?: unknown }} */ (data);
    if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.ids)) list = obj.ids;
  }
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    let type = 'news';
    let id = '';
    if (typeof raw === 'string' || typeof raw === 'number') {
      id = String(raw || '').trim();
    } else if (raw && typeof raw === 'object') {
      const rec = /** @type {{ type?: unknown, id?: unknown }} */ (raw);
      const t = String(rec.type || 'news').trim().toLowerCase();
      type = t === 'event' ? 'event' : 'news';
      id = String(rec.id || '').trim();
    }
    if (!id) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
    if (out.length >= FEATURED_NEWS_MAX) break;
  }
  return out;
}

/**
 * @param {unknown} ids
 * @returns {string[]}
 * @deprecated Prefer normalizeFeaturedItems
 */
export function normalizeFeaturedIds(ids) {
  return normalizeFeaturedItems({ ids: Array.isArray(ids) ? ids : [] })
    .filter((e) => e.type === 'news')
    .map((e) => e.id);
}

/**
 * @param {object[]} catalog
 * @param {string} id
 * @returns {object|undefined}
 */
function findInCatalog(catalog, id) {
  const needle = String(id || '');
  if (!needle) return undefined;
  return catalog.find(
    (item) =>
      item &&
      (String(item.id || '') === needle || String(item.slug || '') === needle),
  );
}

/**
 * @param {object[]} news
 * @param {object[]} events
 * @param {number} limit
 * @returns {object[]}
 */
export function featuredFallbackMix(news, events, limit = FEATURED_NEWS_FALLBACK) {
  const n = Math.max(0, Number(limit) || 0);
  const merged = [
    ...(Array.isArray(news) ? news : []).map((item) => ({
      ...item,
      _featType: 'news',
      _sort: featuredNewsSortKey(item),
    })),
    ...(Array.isArray(events) ? events : []).map((item) => ({
      ...item,
      _featType: 'event',
      _sort: featuredEventSortKey(item),
    })),
  ]
    .filter((item) => hasFeaturedImage(item))
    .sort((a, b) => b._sort - a._sort);
  return merged.slice(0, n).map(({ _sort, ...rest }) => {
    void _sort;
    return rest;
  });
}

/**
 * @param {object[]} news
 * @param {object[]} events
 * @param {unknown} playlistData featured-news.json root or items array
 * @param {number} [fallbackLimit]
 * @returns {object[]}
 */
export function resolveFeaturedPlaylist(
  news,
  events,
  playlistData,
  fallbackLimit = FEATURED_NEWS_FALLBACK,
) {
  const newsList = Array.isArray(news) ? news : [];
  const eventList = Array.isArray(events) ? events : [];
  const ordered = [];
  const used = new Set();
  for (const entry of normalizeFeaturedItems(playlistData)) {
    const catalog = entry.type === 'event' ? eventList : newsList;
    const item = findInCatalog(catalog, entry.id);
    if (!item) continue;
    const key = `${entry.type}:${item.id || item.slug || entry.id}`;
    if (used.has(key)) continue;
    used.add(key);
    ordered.push({ ...item, _featType: entry.type });
  }
  if (ordered.length) return ordered;
  return featuredFallbackMix(newsList, eventList, fallbackLimit);
}

/**
 * @param {object[]} news date-desc live catalog
 * @param {unknown} ids ordered playlist ids
 * @param {number} [fallbackLimit]
 * @returns {object[]}
 * @deprecated Prefer resolveFeaturedPlaylist
 */
export function resolveFeaturedNews(news, ids, fallbackLimit = 3) {
  return resolveFeaturedPlaylist(news, [], { ids }, fallbackLimit);
}

/**
 * Plain-text resume from summary, else stripped body. Empty when neither exists.
 * @param {object} item
 * @param {string} [lang]
 * @param {number} [maxLen=180]
 * @returns {string}
 */
export function editorialResume(item, lang, maxLen = 180) {
  const limit = Math.max(40, Number(maxLen) || 180);
  const summary = editorialField(item, 'summary', lang);
  if (summary) {
    return summary.length > limit ? `${summary.slice(0, limit).trim()}…` : summary;
  }

  const body = String(editorialField(item, 'body', lang) || '')
    .replace(/\\n/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (body) {
    return body.length > limit ? `${body.slice(0, limit).trim()}…` : body;
  }
  return '';
}

/**
 * Featured news teaser: summary, then stripped body; label+date last resort.
 * @param {object} item
 * @param {string} [lang]
 * @returns {string}
 */
export function newsResume(item, lang) {
  const resume = editorialResume(item, lang, 320);
  if (resume) return resume;

  const label = editorialField(item, 'label', lang);
  const date = String((item && item.date) || '').trim();
  return [label, date].filter(Boolean).join(' — ');
}

/**
 * Events page card resume (shorter). Empty string when no summary/body.
 * @param {object} item
 * @param {string} [lang]
 * @returns {string}
 */
export function eventResume(item, lang) {
  return editorialResume(item, lang, 180);
}
