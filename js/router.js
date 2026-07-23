/**
 * Client-side routing: section visibility, deep links, history / back-button.
 * Detail hashes: #news/{slug}, #event/{slug}, #publication/{slug}
 * Preview: #preview/{token} (A1 — candidate payload from CMS, not live JSON)
 */
import {
  switchEventsTab,
  switchResearchTab,
  setPubType,
  updateBreadcrumb,
  updateBottomTabs,
  closeDrawer,
  closeLightbox,
} from './ui.js';
import { getTitleObserver } from './animations.js';
import { renderDetailPage } from './components/detailPage.js';
import { restoreSiteSeoHead } from './seoHead.js';
import { PREVIEW_API_BASE } from './config.js';
import { el, replaceChildren } from './utils.js';
import { t } from './i18n.js';

/** Maps child pages to their primary nav parent. */
export const PAGE_PARENT = { org: 'about', research: 'about', cooperation: 'events', detail: 'home' };

const DETAIL_TYPES = new Set(['news', 'event', 'publication', 'research-project']);

/**
 * @param {string} hashRaw hash without leading #
 * @returns {{ pageId: string, tab?: string, filter?: string, detailType?: string, detailSlug?: string, previewToken?: string }}
 */
export function parseHash(hashRaw) {
  const raw = (hashRaw || 'home').replace(/^#/, '');
  const segments = raw.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const [first, second] = segments;
  if (first === 'preview' && second) {
    return { pageId: 'detail', previewToken: second };
  }
  if (DETAIL_TYPES.has(first) && second) {
    return { pageId: 'detail', detailType: first, detailSlug: second };
  }
  return { pageId: first || 'home' };
}

function showDetailShell() {
  closeLightbox();
  const pages = document.querySelectorAll('.page');
  pages.forEach((p) => p.classList.remove('active'));
  const target = document.getElementById('page-detail');
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

/**
 * @param {string} token
 * @param {{ replace?: boolean }} [opts]
 */
export async function navigateToPreview(token, opts = {}) {
  if (!token) return;
  showDetailShell();

  const host = document.getElementById('detail-root');
  if (host) {
    replaceChildren(host, [
      el('p', { className: 'detail-empty-body', text: t('detail_preview_loading') }),
    ]);
  }

  const hash = `preview/${encodeURIComponent(token)}`;
  if (opts.replace) history.replaceState(null, '', '#' + hash);
  else history.pushState(null, '', '#' + hash);

  updateBreadcrumb('detail');
  updateBottomTabs('home');
  closeDrawer();

  const base = typeof PREVIEW_API_BASE === 'string' ? PREVIEW_API_BASE.trim().replace(/\/$/, '') : '';
  const url = `${base}/api/public/preview/${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.ok || !data.item || !data.type) {
      renderDetailPage('news', '', { isPreview: true, previewItem: null });
      return;
    }
    const type = data.type;
    const slug = data.item.slug || token;
    renderDetailPage(type, slug, { isPreview: true, previewItem: data.item });

    const parentNav =
      type === 'publication' ? 'publications' : type === 'event' ? 'events' : 'home';
    document.querySelectorAll('.nav-links a[data-page]').forEach((a) => {
      const isActive = a.dataset.page === parentNav && !a.dataset.tab;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    updateBottomTabs(parentNav);
  } catch {
    renderDetailPage('news', '', { isPreview: true, previewItem: null });
  }
}

/**
 * Navigate to a page section or detail.
 * @param {string} pageId
 * @param {string} [tab]
 * @param {string} [filter]
 * @param {{ detailType?: string, detailSlug?: string, previewToken?: string, replace?: boolean }} [opts]
 */
export function navigateTo(pageId, tab, filter, opts = {}) {
  if (opts.previewToken) {
    void navigateToPreview(opts.previewToken, { replace: opts.replace });
    return;
  }

  const detailType = opts.detailType;
  const detailSlug = opts.detailSlug;

  if (detailType && detailSlug) {
    showDetailShell();
    renderDetailPage(detailType, detailSlug);

    const parentNav =
      detailType === 'publication'
        ? 'publications'
        : detailType === 'event'
          ? 'events'
          : detailType === 'research-project'
            ? 'research'
            : 'home';
    document.querySelectorAll('.nav-links a[data-page]').forEach((a) => {
      const isActive = a.dataset.page === parentNav && !a.dataset.tab;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const hash = `${detailType}/${encodeURIComponent(detailSlug)}`;
    if (opts.replace) history.replaceState(null, '', '#' + hash);
    else history.pushState(null, '', '#' + hash);

    updateBreadcrumb('detail');
    updateBottomTabs(parentNav);
    closeDrawer();
    return;
  }

  // Legacy: navigateTo('news/slug') string from popstate
  const parsed = parseHash(pageId);
  if (parsed.previewToken) {
    void navigateToPreview(parsed.previewToken, { replace: opts.replace });
    return;
  }
  if (parsed.detailType && parsed.detailSlug) {
    navigateTo('detail', undefined, undefined, {
      detailType: parsed.detailType,
      detailSlug: parsed.detailSlug,
      replace: opts.replace,
    });
    return;
  }

  const resolvedId = parsed.pageId;
  restoreSiteSeoHead();
  const pages = document.querySelectorAll('.page');
  pages.forEach((p) => p.classList.remove('active'));
  const target = document.getElementById('page-' + resolvedId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const navPageId = PAGE_PARENT[resolvedId] || resolvedId;
  document.querySelectorAll('.nav-links a[data-page]').forEach((a) => {
    const isActive = a.dataset.page === navPageId && !a.dataset.tab;
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  document.querySelectorAll('.drawer-item[data-page]').forEach((a) => {
    const isActive = a.dataset.page === resolvedId && !a.dataset.tab;
    a.classList.toggle('active', isActive);
  });

  if (opts.replace) history.replaceState(null, '', '#' + resolvedId);
  else history.pushState(null, '', '#' + resolvedId);

  if (resolvedId === 'events' && tab) switchEventsTab(tab);
  if (resolvedId === 'research' && tab) switchResearchTab(tab);
  if (filter && resolvedId === 'publications') {
    const btn = document.querySelector(`#pub-filter .dept-tab[data-pub-type="${filter}"]`);
    setPubType(filter, btn);
  }

  updateBreadcrumb(resolvedId);
  updateBottomTabs(resolvedId);
  closeDrawer();

  document.querySelectorAll('.has-dropdown, .has-mega').forEach((d) => d.classList.remove('open'));

  const titleObserver = getTitleObserver();
  if (titleObserver) {
    const newTitles = target ? target.querySelectorAll('.section-title:not(.drawn)') : [];
    newTitles.forEach((tt) => titleObserver.observe(tt));
  }
}

/** Open a detail route by type + slug. */
export function navigateToDetail(type, slug, replace = false) {
  if (!type || !slug) return;
  navigateTo('detail', undefined, undefined, {
    detailType: type,
    detailSlug: slug,
    replace,
  });
}

/** Bind navigation click delegation + popstate. */
export function bindRouter() {
  document.addEventListener('click', function (e) {
    const detailEl = e.target.closest('[data-detail-type][data-detail-slug]');
    if (detailEl) {
      e.preventDefault();
      navigateToDetail(detailEl.dataset.detailType, detailEl.dataset.detailSlug);
      return;
    }
    const el = e.target.closest('[data-page]');
    if (!el) return;
    e.preventDefault();
    navigateTo(el.dataset.page, el.dataset.tab, el.dataset.filter);
  });

  window.addEventListener('popstate', function () {
    const hash = location.hash.replace('#', '') || 'home';
    const parsed = parseHash(hash);
    if (parsed.previewToken) {
      void navigateToPreview(parsed.previewToken, { replace: true });
    } else if (parsed.detailType && parsed.detailSlug) {
      navigateTo('detail', undefined, undefined, {
        detailType: parsed.detailType,
        detailSlug: parsed.detailSlug,
        replace: true,
      });
    } else {
      navigateTo(parsed.pageId, undefined, undefined, { replace: true });
    }
  });
}

/** Initial route from URL hash. */
export function initRoute() {
  const initHash = location.hash.replace('#', '') || 'home';
  const parsed = parseHash(initHash);
  if (parsed.previewToken) {
    void navigateToPreview(parsed.previewToken, { replace: true });
  } else if (parsed.detailType && parsed.detailSlug) {
    navigateTo('detail', undefined, undefined, {
      detailType: parsed.detailType,
      detailSlug: parsed.detailSlug,
      replace: true,
    });
  } else {
    navigateTo(parsed.pageId, undefined, undefined, { replace: true });
  }
}
