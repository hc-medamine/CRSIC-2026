/**
 * Language state, locale JSON loading, RTL/LTR, localStorage + URL persistence.
 * Dictionaries: data/locales/{ar,en}.json (or CONTENT_BASE_URL).
 *
 * Locale URL: ?lang=ar|en (hash routes stay #page). Path /ar|/en is not used —
 * this is a static hash SPA without a server rewrite layer.
 */
import { setTrustedBrHtml } from './utils.js';
import { contentUrl } from './config.js';

const LANG_KEY = 'crsic_lang';
const BANNER_KEY = 'crsic_banner_dismissed';
const MISSING_WARNED = new Set();

/** @type {Record<string, Record<string, string>>} */
let TRANSLATIONS = { ar: {}, en: {} };

/** @type {string[]} */
let missingKeysLog = [];

function readLangFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'ar' || q === 'en') return q;
  } catch (_) { /* ignore */ }
  return null;
}

function writeLangToUrl(lang) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch (_) { /* ignore */ }
}

function safeLocalStorageGet(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch (_) { /* ignore */ }
}

const urlLang = typeof window !== 'undefined' ? readLangFromUrl() : null;
let currentLang = urlLang || safeLocalStorageGet(LANG_KEY) || 'ar';
if (urlLang) safeLocalStorageSet(LANG_KEY, urlLang);

let onAfterTranslate = null;
let localesPromise = null;

/** Register callback invoked after DOM translations are applied (e.g. re-render cards). */
export function setOnAfterTranslate(fn) {
  onAfterTranslate = fn;
}

export function getLang() {
  return currentLang;
}

/**
 * Translate UI chrome. Warns once per missing key in current locale.
 * Falls back to Arabic, then the key string (never invents English copy).
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  const cur = TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key];
  if (cur) return cur;
  if (currentLang !== 'ar') {
    const missId = `${currentLang}:${key}`;
    if (!MISSING_WARNED.has(missId)) {
      MISSING_WARNED.add(missId);
      missingKeysLog.push(missId);
      console.warn(`[i18n] Missing key "${key}" for locale "${currentLang}"`);
    }
  }
  return (TRANSLATIONS.ar && TRANSLATIONS.ar[key]) || key;
}

/** @returns {string[]} missing keys logged this session (current≠ar) */
export function getMissingKeys() {
  return missingKeysLog.slice();
}

/**
 * Soft-load one locale file.
 * @param {'ar'|'en'} lang
 */
async function loadLocaleFile(lang) {
  const url = contentUrl(`locales/${lang}.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} loading locales/${lang}.json`);
  const data = await res.json();
  if (!data || typeof data !== 'object') throw new Error(`Invalid locale JSON: ${lang}`);
  TRANSLATIONS[lang] = data;
}

/**
 * Fetch ar + en locale dictionaries in parallel.
 * Soft-fails per file (empty dict + console error).
 * @returns {Promise<{ ok: boolean, errors: Record<string, string> }>}
 */
export function loadLocales() {
  if (localesPromise) return localesPromise;

  localesPromise = (async () => {
    const errors = {};
    await Promise.all(['ar', 'en'].map(async (lang) => {
      try {
        await loadLocaleFile(lang);
      } catch (err) {
        console.error(`[i18n] Failed to load locales/${lang}.json:`, err);
        errors[lang] = err && err.message ? err.message : String(err);
        TRANSLATIONS[lang] = TRANSLATIONS[lang] || {};
      }
    }));
    reportKeyParity();
    return {
      ok: Object.keys(errors).length === 0,
      errors,
    };
  })();

  return localesPromise;
}

function reportKeyParity() {
  const arKeys = new Set(Object.keys(TRANSLATIONS.ar || {}));
  const enKeys = new Set(Object.keys(TRANSLATIONS.en || {}));
  const onlyAr = [...arKeys].filter((k) => !enKeys.has(k));
  const onlyEn = [...enKeys].filter((k) => !arKeys.has(k));
  if (onlyAr.length) console.warn('[i18n] Keys in ar but not en:', onlyAr);
  if (onlyEn.length) console.warn('[i18n] Keys in en but not ar:', onlyEn);
}

export function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'en' ? 'ltr' : 'rtl';
  writeLangToUrl(currentLang);

  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.ar || {};
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const val = dict[node.dataset.i18n];
    if (val) node.textContent = val;
    else if (node.dataset.i18n) t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    const val = dict[node.dataset.i18nHtml];
    if (val) setTrustedBrHtml(node, val);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const val = dict[node.dataset.i18nPlaceholder];
    if (val) node.placeholder = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    const val = dict[node.dataset.i18nAria];
    if (val) node.setAttribute('aria-label', val);
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
  });

  const titleKey = 'doc_title';
  if (dict[titleKey]) document.title = dict[titleKey];
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict.doc_description) metaDesc.setAttribute('content', dict.doc_description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && dict.doc_title) ogTitle.setAttribute('content', dict.doc_title);

  document.querySelectorAll('[data-loaded]').forEach((node) => delete node.dataset.loaded);
  if (typeof onAfterTranslate === 'function') onAfterTranslate();
}

export function setLang(lang) {
  if (lang !== 'ar' && lang !== 'en') return;
  if (lang === currentLang) {
    writeLangToUrl(lang);
    return;
  }
  currentLang = lang;
  safeLocalStorageSet(LANG_KEY, lang);
  applyTranslations();
  hideLangBanner();
}

export function showLangBanner() {
  const banner = document.getElementById('langBanner');
  if (banner) banner.classList.remove('hidden');
}

export function hideLangBanner() {
  const banner = document.getElementById('langBanner');
  if (banner) banner.classList.add('hidden');
  safeLocalStorageSet(BANNER_KEY, '1');
}

export function initLangBanner() {
  const storedLang = safeLocalStorageGet(LANG_KEY);
  const dismissed = safeLocalStorageGet(BANNER_KEY);
  if (!storedLang && !dismissed && !readLangFromUrl()) {
    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('en') || browserLang.startsWith('fr')) {
      setTimeout(showLangBanner, 1200);
    }
  }
}

export function bindLangUI() {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.lang-btn');
    if (btn) {
      setLang(btn.dataset.lang);
      return;
    }
    if (e.target.closest('.lang-banner-switch')) {
      setLang('en');
      hideLangBanner();
      return;
    }
    if (e.target.closest('[data-switch-lang]')) {
      const lang = e.target.closest('[data-switch-lang]').dataset.switchLang;
      setLang(lang);
      return;
    }
    if (e.target.closest('.lang-banner-dismiss')) {
      hideLangBanner();
    }
  });
}

/** Exported for tests — parse lang from a search string. */
export function parseLangParam(search) {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('lang');
  return q === 'ar' || q === 'en' ? q : null;
}
