/**
 * Data access layer — loads content JSON via fetch().
 * Local files under /data, or CMS/CDN when CONTENT_BASE_URL is set (js/config.js).
 * Callers use sync getters after await loadData().
 */
import { contentUrl } from './config.js';
import { normalizeFeaturedIds } from './featuredNews.js';
import { safeImageSrc } from './utils.js';

/** @type {string[]} */
let covers = [];
/** @type {object[]} */
let pubs = [];
/** @type {object[]} */
let intlEvents = [];
/** @type {object[]} */
let natEvents = [];
/** @type {object[]} */
let natPartners = [];
/** @type {object[]} */
let intlPartners = [];
/** @type {object[]} */
let journals = [];
/** @type {object[]} */
let news = [];
/** @type {object[]} */
let researchGroups = [];
/** @type {object[]} */
let researchProjects = [];
/** @type {object[]} */
let laws = [];
/** @type {object[]} */
let platforms = [];
/** @type {object | null} */
let director = null;
/** @type {object | null} */
let sitePages = null;
/** @type {string[]} */
let featuredNewsIds = [];

/** @type {Record<string, string>} resource key → error message */
const loadErrors = {};

let loaded = false;
let loadPromise = null;

/**
 * @param {string} relativePath path under content base, e.g. 'publications.json'
 * @returns {Promise<object>}
 */
async function fetchJson(relativePath) {
  const url = contentUrl(relativePath, import.meta.url);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} loading ${relativePath}`);
  }
  return res.json();
}

/**
 * Soft-load one resource; on failure record error and leave cache empty for that resource.
 * Optional resources (empty playlist) must not trip the Home data-error banner.
 * @param {string} key
 * @param {string} relativePath
 * @param {(data: object) => void} apply
 * @param {{ optional?: boolean }} [opts]
 */
async function loadResource(key, relativePath, apply, opts) {
  try {
    const data = await fetchJson(relativePath);
    apply(data);
    delete loadErrors[key];
  } catch (err) {
    console.error(`[data] Failed to load ${relativePath}:`, err);
    if (opts && opts.optional) {
      delete loadErrors[key];
      return;
    }
    loadErrors[key] = err && err.message ? err.message : String(err);
  }
}

/**
 * Fetch all content JSON files in parallel (soft-fail per file).
 * Safe to call multiple times — subsequent calls reuse the same promise.
 * @returns {Promise<{ ok: boolean, errors: Record<string, string> }>}
 */
export function loadData() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await Promise.all([
      loadResource('publications', 'publications.json', (data) => {
        covers = Array.isArray(data.covers) ? data.covers : [];
        pubs = Array.isArray(data.pubs) ? data.pubs : [];
        if (covers.length !== pubs.length) {
          console.warn(
            `[data] covers/pubs length mismatch: covers=${covers.length} pubs=${pubs.length}`
          );
        }
      }),
      loadResource('events', 'events.json', (data) => {
        intlEvents = Array.isArray(data.intl) ? data.intl : [];
        natEvents = Array.isArray(data.nat) ? data.nat : [];
      }),
      loadResource('partners', 'partners.json', (data) => {
        natPartners = Array.isArray(data.nat) ? data.nat : [];
        intlPartners = Array.isArray(data.intl) ? data.intl : [];
      }),
      loadResource('journals', 'journals.json', (data) => {
        journals = Array.isArray(data.journals) ? data.journals : [];
      }),
      loadResource('news', 'news.json', (data) => {
        news = Array.isArray(data.news) ? data.news : [];
      }),
      loadResource('researchGroups', 'research-groups.json', (data) => {
        researchGroups = Array.isArray(data.items) ? data.items : [];
      }),
      loadResource('researchProjects', 'research-projects.json', (data) => {
        researchProjects = Array.isArray(data.items) ? data.items : [];
      }),
      loadResource('laws', 'laws.json', (data) => {
        laws = Array.isArray(data.laws) ? data.laws : [];
      }),
      loadResource('platforms', 'platforms.json', (data) => {
        platforms = Array.isArray(data.platforms) ? data.platforms : [];
      }),
      loadResource('director', 'director.json', (data) => {
        director =
          data && typeof data === 'object' && typeof data.quote_ar === 'string'
            ? data
            : null;
      }),
      loadResource(
        'sitePages',
        'site-pages.json',
        (data) => {
          sitePages =
            data && typeof data === 'object' && data.ar && typeof data.ar === 'object'
              ? data
              : null;
        },
        { optional: true },
      ),
      loadResource(
        'featuredNews',
        'featured-news.json',
        (data) => {
          featuredNewsIds = normalizeFeaturedIds(data && data.ids);
        },
        { optional: true },
      ),
    ]);

    loaded = true;
    return {
      ok: Object.keys(loadErrors).length === 0,
      errors: { ...loadErrors },
    };
  })();

  return loadPromise;
}

export function isDataLoaded() {
  return loaded;
}

/** @returns {Record<string, string>} */
export function getLoadErrors() {
  return { ...loadErrors };
}

/** @returns {string[]} */
export function getCovers() {
  return covers;
}

/** @returns {object[]} */
export function getPubs() {
  return pubs;
}

/** @param {number} i */
export function getPub(i) {
  return pubs[i];
}

/** @param {number} i */
export function getCover(i) {
  return covers[i];
}

/**
 * Primary image from a CMS-published item (`media[]`, then `img` / `cover` / `og_image`).
 * @param {object|undefined} item
 * @returns {string}
 */
export function cmsItemImageSrc(item) {
  if (!item) return '';
  const fromMedia = Array.isArray(item.media)
    ? item.media.find((m) => m && m.kind === 'image' && m.src)?.src
    : '';
  return String(fromMedia || item.img || item.cover || item.og_image || '').trim();
}

/**
 * Card/carousel image: cropped 16:9 variant when published, else the master.
 * @param {object|undefined} item
 * @returns {string}
 */
export function cmsCardImageSrc(item) {
  if (!item) return '';
  const card = String(item.img_card || '').trim();
  return card || cmsItemImageSrc(item);
}

/**
 * WebP sibling for card/detail images when published.
 * @param {object|undefined} item
 * @param {'card'|'master'|'portrait'} [variant]
 * @returns {string}
 */
export function cmsWebpSrc(item, variant = 'card') {
  if (!item) return '';
  if (variant === 'portrait') {
    return safeImageSrc(item.portrait_webp || item.img_webp || '');
  }
  const cardWebp = String(item.img_card_webp || '').trim();
  const masterWebp = String(item.img_webp || item.cover_webp || '').trim();
  if (variant === 'master') return safeImageSrc(masterWebp);
  return safeImageSrc(cardWebp || masterWebp);
}

/**
 * Fallback + WebP sources for picture elements.
 * @param {object|undefined} item
 * @param {'card'|'master'|'pub'} [variant]
 * @param {number} [pubIndex]
 * @returns {{ fallback: string, webp: string }}
 */
export function cmsResponsiveSources(item, variant = 'card', pubIndex) {
  let fallback = '';
  if (variant === 'pub') fallback = safeImageSrc(pubCardImageSrc(item, pubIndex));
  else if (variant === 'card') fallback = safeImageSrc(cmsCardImageSrc(item));
  else fallback = safeImageSrc(cmsItemImageSrc(item));
  const webp =
    variant === 'master'
      ? cmsWebpSrc(item, 'master')
      : cmsWebpSrc(item, variant === 'pub' ? 'card' : variant);
  return { fallback, webp };
}

/**
 * Cover for a CMS-published publication: item fields first, then legacy `covers[i]`.
 * @param {object|undefined} pub
 * @param {number} [index]
 * @returns {string}
 */
export function coverSrcFromPub(pub, index) {
  const fromItem = cmsItemImageSrc(pub);
  if (fromItem) return fromItem;
  const fromCovers = Number.isInteger(index) ? covers[index] : '';
  return String(fromCovers || '').trim();
}

/**
 * Publication card image: img_card, else master cover.
 * @param {object|undefined} pub
 * @param {number} [index]
 * @returns {string}
 */
export function pubCardImageSrc(pub, index) {
  const card = String(pub?.img_card || '').trim();
  if (card) return card;
  return coverSrcFromPub(pub, index);
}

/** @param {number} i */
export function getCoverForPub(i) {
  return coverSrcFromPub(pubs[i], i);
}

/** @returns {object[]} */
export function getIntlEvents() {
  return intlEvents;
}

/** @returns {object[]} */
export function getNatEvents() {
  return natEvents;
}

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
 * Sort key YYYYMMDD from event day/month/year fields (best-effort).
 * @param {object} e
 * @returns {number}
 */
function eventSortKey(e) {
  const y = parseInt(e && e.year, 10) || 0;
  const m = MONTH_RANK[String((e && e.month) || '').trim()] || 0;
  const d = parseInt(e && e.day, 10) || 0;
  return y * 10000 + m * 100 + d;
}

/**
 * Merge international + national events, newest first.
 * @returns {object[]}
 */
export function getAllEvents() {
  return [...intlEvents, ...natEvents].sort((a, b) => eventSortKey(b) - eventSortKey(a));
}

/**
 * Latest events for the home teaser (default 3).
 * @param {number} [limit=3]
 * @returns {object[]}
 */
export function getHomeEvents(limit = 3) {
  const n = Math.max(0, Number(limit) || 0);
  return getAllEvents().slice(0, n);
}

/** @returns {object[]} */
export function getNatPartners() {
  return natPartners;
}

/** @returns {object[]} */
export function getIntlPartners() {
  return intlPartners;
}

/** @returns {object[]} */
export function getJournals() {
  return journals;
}

/** @returns {object[]} */
export function getNews() {
  return news;
}

/** Ordered ids from featured-news.json (may be empty → SPA fallback). */
export function getFeaturedNewsIds() {
  return featuredNewsIds;
}

/** @returns {object[]} */
export function getResearchGroups() {
  return researchGroups;
}

/** @returns {object[]} */
export function getResearchProjects() {
  return researchProjects;
}

/**
 * @param {string} groupId
 * @returns {object[]}
 */
export function getResearchProjectsForGroup(groupId) {
  const id = String(groupId || '');
  return researchProjects.filter((p) => p && p.groupId === id);
}

/**
 * @param {string} key slug or id
 * @returns {object|undefined}
 */
export function findResearchProjectByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  return researchProjects.find((p) => p && (p.slug === k || p.id === k));
}

/**
 * @param {string} key slug or id
 * @returns {object|undefined}
 */
export function findResearchGroupByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  return researchGroups.find((g) => g && (g.slug === k || g.id === k));
}

/**
 * @param {string} key slug or id
 * @returns {object|undefined}
 */
export function findPartnerByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  const all = [...natPartners, ...intlPartners];
  return all.find((p) => p && (p.slug === k || p.id === k));
}

/**
 * @param {string} key slug or id
 * @returns {object|undefined}
 */
export function findNewsByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  return news.find((n) => n && (n.slug === k || n.id === k));
}

/**
 * @param {string} key slug or id
 * @returns {object|undefined}
 */
export function findEventByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  return getAllEvents().find((e) => e && (e.slug === k || e.id === k));
}

/**
 * @param {string} key slug or id
 * @returns {{ pub: object, index: number }|null}
 */
export function findPublicationByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  const index = pubs.findIndex((p) => p && (p.slug === k || p.id === k));
  if (index < 0) return null;
  return { pub: pubs[index], index };
}

export function getLaws() {
  return laws;
}

export function getPlatforms() {
  return platforms;
}

/** @returns {object | null} */
export function getDirector() {
  return director;
}

/** @returns {object | null} */
export function getSitePages() {
  return sitePages;
}

export function findPlatformByKey(key) {
  const k = String(key || '');
  return platforms.find((p) => p && (p.slug === k || p.id === k)) || null;
}

/** @param {string} key slug or id */
export function findLawByKey(key) {
  const k = decodeURIComponent(String(key || ''));
  return laws.find((p) => p && (p.slug === k || p.id === k)) || null;
}
