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
import {
  renderAll,
  bindUIEvents,
  primeSkeletons,
  showDataLoadErrors
} from './ui.js';
import { bindRouter, initRoute } from './router.js';
import { initAnimations } from './animations.js';

async function boot() {
  setOnAfterTranslate(() => {
    renderAll();
    showDataLoadErrors(getLoadErrors());
  });

  bindLangUI();
  bindUIEvents();
  bindRouter();
  initLangBanner();
  initRoute();

  primeSkeletons();

  // Locales + content in parallel (same CONTENT_BASE_URL / local /data)
  const [localeResult] = await Promise.all([loadLocales(), loadData()]);

  applyTranslations();
  if (localeResult && !localeResult.ok) {
    showDataLoadErrors({
      ...getLoadErrors(),
      locales: Object.keys(localeResult.errors).join(','),
    });
  }
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
