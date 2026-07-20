/**
 * Data access layer — loads content JSON via fetch().
 * Local files under /data, or CMS/CDN when CONTENT_BASE_URL is set (js/config.js).
 * Callers use sync getters after await loadData().
 */
import { contentUrl } from './config.js';

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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} loading ${relativePath}`);
  }
  return res.json();
}

/**
 * Soft-load one resource; on failure record error and leave cache empty for that resource.
 * @param {string} key
 * @param {string} relativePath
 * @param {(data: object) => void} apply
 */
async function loadResource(key, relativePath, apply) {
  try {
    const data = await fetchJson(relativePath);
    apply(data);
    delete loadErrors[key];
  } catch (err) {
    console.error(`[data] Failed to load ${relativePath}:`, err);
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

/** @param {number} i */
export function getCoverForPub(i) {
  return covers[i] || '';
}
