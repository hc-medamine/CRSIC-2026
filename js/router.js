/**
 * Client-side routing: section visibility, deep links, history / back-button.
 */
import {
  switchEventsTab,
  switchResearchTab,
  setPubType,
  updateBreadcrumb,
  updateBottomTabs,
  closeDrawer
} from './ui.js';
import { getTitleObserver } from './animations.js';

/** Maps child pages to their primary nav parent. */
export const PAGE_PARENT = { org: 'about', research: 'about', cooperation: 'events' };

/**
 * Navigate to a page section.
 * @param {string} pageId
 * @param {string} [tab] — events tab (intl|nat) or research tab (r1–r4)
 * @param {string} [filter] — publications filter (all|collective|individual)
 */
export function navigateTo(pageId, tab, filter) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const navPageId = PAGE_PARENT[pageId] || pageId;
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    const isActive = a.dataset.page === navPageId && !a.dataset.tab;
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  document.querySelectorAll('.drawer-item[data-page]').forEach(a => {
    const isActive = a.dataset.page === pageId && !a.dataset.tab;
    a.classList.toggle('active', isActive);
  });

  history.pushState(null, '', '#' + pageId);

  if (pageId === 'events' && tab) switchEventsTab(tab);
  if (pageId === 'research' && tab) switchResearchTab(tab);
  if (filter && pageId === 'publications') {
    const btn = document.querySelector(`#pub-filter .dept-tab[data-pub-type="${filter}"]`);
    setPubType(filter, btn);
  }

  updateBreadcrumb(pageId);
  updateBottomTabs(pageId);
  closeDrawer();

  document.querySelectorAll('.has-dropdown, .has-mega').forEach(d => d.classList.remove('open'));

  const titleObserver = getTitleObserver();
  if (titleObserver) {
    const newTitles = target ? target.querySelectorAll('.section-title:not(.drawn)') : [];
    newTitles.forEach(tt => titleObserver.observe(tt));
  }
}

/** Bind navigation click delegation + popstate. */
export function bindRouter() {
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-page]');
    if (!el) return;
    e.preventDefault();
    navigateTo(el.dataset.page, el.dataset.tab, el.dataset.filter);
  });

  window.addEventListener('popstate', function () {
    const hash = location.hash.replace('#', '') || 'home';
    navigateTo(hash);
  });
}

/** Initial route from URL hash. */
export function initRoute() {
  const initHash = location.hash.replace('#', '') || 'home';
  navigateTo(initHash);
}
