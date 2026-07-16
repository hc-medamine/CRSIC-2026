/**
 * Language state, locale JSON loading, RTL/LTR, localStorage persistence.
 * Dictionaries live in data/locales/{ar,en}.json (or CMS via CONTENT_BASE_URL).
 */
import { setTrustedBrHtml } from './utils.js';
import { contentUrl } from './config.js';

const LANG_KEY = 'crsic_lang';
const BANNER_KEY = 'crsic_banner_dismissed';

/** @type {Record<string, Record<string, string>>} */
let TRANSLATIONS = { ar: {}, en: {} };

let currentLang = localStorage.getItem(LANG_KEY) || 'ar';
let onAfterTranslate = null;
let localesPromise = null;

/** Register callback invoked after DOM translations are applied (e.g. re-render cards). */
export function setOnAfterTranslate(fn) {
  onAfterTranslate = fn;
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key])
    || (TRANSLATIONS.ar && TRANSLATIONS.ar[key])
    || key;
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
    return {
      ok: Object.keys(errors).length === 0,
      errors,
    };
  })();

  return localesPromise;
}

export function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'en' ? 'ltr' : 'rtl';
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.ar || {};
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const val = dict[node.dataset.i18n];
    if (val) node.textContent = val;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    const val = dict[node.dataset.i18nHtml];
    if (val) setTrustedBrHtml(node, val);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const val = dict[node.dataset.i18nPlaceholder];
    if (val) node.placeholder = val;
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
  });
  document.querySelectorAll('[data-loaded]').forEach((node) => delete node.dataset.loaded);
  if (typeof onAfterTranslate === 'function') onAfterTranslate();
}

export function setLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
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
  localStorage.setItem(BANNER_KEY, '1');
}

export function initLangBanner() {
  const storedLang = localStorage.getItem(LANG_KEY);
  const dismissed = localStorage.getItem(BANNER_KEY);
  if (!storedLang && !dismissed) {
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
    if (e.target.closest('.lang-banner-dismiss')) {
      hideLangBanner();
    }
  });
}
