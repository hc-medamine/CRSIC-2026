/**
 * Application entry point — boots modules and wires global listeners.
 */
import {
  applyTranslations,
  setOnAfterTranslate,
  bindLangUI,
  initLangBanner,
  loadLocales
} from './i18n.js';
import { loadData, getLoadErrors } from './data.js';
import { initSiteAlert, rerenderSiteAlert } from './alerts.js';
import { renderResearchPage } from './research.js';
import {
  renderAll,
  bindUIEvents,
  primeSkeletons,
  showDataLoadErrors
} from './ui.js';
import { bindRouter, initRoute, parseHash } from './router.js';
import { renderDetailPage } from './components/detailPage.js';
import { initAnimations } from './animations.js';

async function boot() {
  setOnAfterTranslate(() => {
    renderAll();
    renderResearchPage();
    showDataLoadErrors(getLoadErrors());
    rerenderSiteAlert();
    const parsed = parseHash(location.hash.replace('#', '') || 'home');
    if (parsed.detailType && parsed.detailSlug) {
      renderDetailPage(parsed.detailType, parsed.detailSlug);
    }
  });

  bindLangUI();
  bindUIEvents();
  bindRouter();
  initLangBanner();

  primeSkeletons();

  // Locales + content in parallel (same CONTENT_BASE_URL / local /data)
  const [localeResult] = await Promise.all([loadLocales(), loadData()]);
  await initSiteAlert();

  applyTranslations();
  renderResearchPage();
  if (localeResult && !localeResult.ok) {
    showDataLoadErrors({
      ...getLoadErrors(),
      locales: Object.keys(localeResult.errors).join(','),
    });
  }
  initRoute();
  initAnimations();
}

function onBootError(err) {
  console.error('[boot] Failed to start app:', err);
  showDataLoadErrors({ boot: err && err.message ? err.message : String(err) });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot().catch(onBootError);
  });
} else {
  boot().catch(onBootError);
}
