/**
 * Site-wide alert banner — fetches data/alerts.json (CMS-published; at most one live item)
 * and renders it under the language-detection banner.
 *
 * Dismissal is remembered for the current browser session only (sessionStorage), keyed by
 * the alert's id — so a newly-published alert (different id) always reappears even if the
 * previous one was dismissed.
 */
import { contentUrl } from './config.js';
import { getLang } from './i18n.js';

const DISMISS_KEY = 'crsic_alert_dismissed';

/** @type {{ id: string, message_ar: string, message_en: string, link: string|null, link_label_ar: string, link_label_en: string }|null} */
let currentAlert = null;

function safeSessionGet(key) {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(key, value);
  } catch (_) { /* ignore */ }
}

function isDismissed(id) {
  return Boolean(id) && safeSessionGet(DISMISS_KEY) === id;
}

/** Render (or hide) the banner for the currently-loaded alert, in the active language. */
function render() {
  const banner = document.getElementById('siteAlertBanner');
  const msgEl = document.getElementById('siteAlertMessage');
  const linkEl = document.getElementById('siteAlertLink');
  if (!banner || !msgEl || !linkEl) return;

  if (!currentAlert || isDismissed(currentAlert.id)) {
    banner.classList.add('hidden');
    return;
  }

  const lang = getLang();
  const message = lang === 'en'
    ? (currentAlert.message_en || currentAlert.message_ar || '')
    : (currentAlert.message_ar || currentAlert.message_en || '');
  msgEl.textContent = message;

  const link = currentAlert.link;
  if (link) {
    const label = lang === 'en'
      ? (currentAlert.link_label_en || currentAlert.link_label_ar || link)
      : (currentAlert.link_label_ar || currentAlert.link_label_en || link);
    linkEl.textContent = label;
    linkEl.href = link;
    linkEl.classList.remove('hidden');
  } else {
    linkEl.textContent = '';
    linkEl.removeAttribute('href');
    linkEl.classList.add('hidden');
  }

  banner.classList.toggle('hidden', !message);
}

function dismiss() {
  if (currentAlert && currentAlert.id) safeSessionSet(DISMISS_KEY, currentAlert.id);
  const banner = document.getElementById('siteAlertBanner');
  if (banner) banner.classList.add('hidden');
}

async function fetchAlert() {
  try {
    const url = contentUrl('alerts.json', import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading alerts.json`);
    const data = await res.json();
    const items = Array.isArray(data && data.items) ? data.items : [];
    currentAlert = items[0] || null;
  } catch (err) {
    console.error('[alerts] Failed to load alerts.json:', err);
    currentAlert = null;
  }
}

/** Fetch alerts.json and render the banner. Call once at boot, after locales load. */
export async function initSiteAlert() {
  await fetchAlert();
  render();
}

/** Re-render with the current language — call from the i18n onAfterTranslate hook. */
export function rerenderSiteAlert() {
  render();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#siteAlertDismiss')) dismiss();
});
