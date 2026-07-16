/**
 * DOM rendering helpers, section renderers, lightbox, breadcrumb, nav UI, filters/tabs.
 * Dynamic content is built with createElement / textContent (P2 — no string innerHTML).
 */
import {
  getPubs,
  getCover,
  getPub,
  getNews,
  getJournals,
  getIntlEvents,
  getNatEvents,
  getNatPartners,
  getIntlPartners
} from './data.js';
import { t, getLang } from './i18n.js';
import {
  prefersReducedMotion,
  el,
  replaceChildren,
  safeImageSrc
} from './utils.js';
import { createPubCard } from './components/pubCard.js';
import { createEventYearGroups } from './components/eventCard.js';
import { createPartnerCard } from './components/partnerCard.js';
import { createJournalCard } from './components/journalCard.js';
import { createNewsCard } from './components/newsCard.js';

/* ── SKELETON HELPERS ────────────────────────────────── */
function skelNodes(className, n) {
  return Array.from({ length: n }, () => el('div', { className: `skeleton ${className}` }));
}

function fillSkeletons(container, className, n) {
  if (!container || container.dataset.loaded) return;
  replaceChildren(container, skelNodes(className, n));
}

/* ── PUBLICATION FILTER STATE ────────────────────────── */
let currentPubType = 'all';

export function getCurrentPubType() {
  return currentPubType;
}

/* ── BREADCRUMBS ─────────────────────────────────────── */
const BC_MAP = {
  home: [],
  about: [{ key: 'bc_about', page: 'about' }],
  org: [{ key: 'bc_about', page: 'about' }, { key: 'bc_org', page: 'org' }],
  research: [{ key: 'bc_output', page: 'publications' }, { key: 'bc_research', page: 'research' }],
  publications: [{ key: 'bc_output', page: 'publications' }, { key: 'bc_publications', page: 'publications' }],
  journals: [{ key: 'bc_output', page: 'publications' }, { key: 'bc_journals', page: 'journals' }],
  events: [{ key: 'bc_events', page: 'events' }, { key: 'bc_events_label', page: 'events' }],
  cooperation: [{ key: 'bc_events', page: 'events' }, { key: 'bc_cooperation', page: 'cooperation' }],
  contact: [{ key: 'bc_contact', page: 'contact' }],
};

const BOTTOM_TAB_PAGES = ['home', 'publications', 'journals', 'events'];

const ERROR_MSG = {
  ar: 'تعذّر تحميل المحتوى. يرجى تحديث الصفحة.',
  en: 'Could not load content. Please refresh the page.',
};

const SECTION_CONTAINERS = {
  publications: ['home-pub-grid', 'pub-grid'],
  news: ['home-news-grid'],
  journals: ['journals-grid'],
  events: ['ev-intl-list', 'ev-nat-list'],
  partners: ['nat-partners', 'intl-partners'],
};

/** Show loading skeletons before async data arrives. */
export function primeSkeletons() {
  fillSkeletons(document.getElementById('home-pub-grid'), 'skeleton-pub', 4);
  fillSkeletons(document.getElementById('home-news-grid'), 'skeleton-news', 6);
  fillSkeletons(document.getElementById('pub-grid'), 'skeleton-pub', 8);
  fillSkeletons(document.getElementById('journals-grid'), 'skeleton-journal', 4);
}

/**
 * Surface soft-fail load errors in a banner and affected grids.
 * @param {Record<string, string>} errors
 */
export function showDataLoadErrors(errors) {
  const keys = Object.keys(errors || {});
  const banner = document.getElementById('dataErrorBanner');
  const msgEl = document.getElementById('dataErrorBannerMsg');
  if (!keys.length) {
    if (banner) banner.classList.add('hidden');
    return;
  }

  const lang = getLang();
  const label = lang === 'en' ? ERROR_MSG.en : ERROR_MSG.ar;
  if (msgEl) {
    msgEl.textContent = `${label} (${keys.join(', ')})`;
  }
  if (banner) banner.classList.remove('hidden');

  keys.forEach((key) => {
    const ids = SECTION_CONTAINERS[key] || [];
    ids.forEach((id) => {
      const node = document.getElementById(id);
      if (node && !node.children.length) {
        replaceChildren(node, [el('div', { className: 'data-load-error', text: label })]);
        node.dataset.loaded = '1';
      }
    });
  });
}

/* ── INITIAL RENDER ──────────────────────────────────── */
export function renderAll() {
  const hpg = document.getElementById('home-pub-grid');
  const hng = document.getElementById('home-news-grid');
  const pg = document.getElementById('pub-grid');
  const jg = document.getElementById('journals-grid');

  fillSkeletons(hpg, 'skeleton-pub', 4);
  fillSkeletons(hng, 'skeleton-news', 6);
  fillSkeletons(pg, 'skeleton-pub', 8);
  fillSkeletons(jg, 'skeleton-journal', 4);

  requestAnimationFrame(() => {
    const pubs = getPubs();
    const news = getNews();
    const journals = getJournals();
    const evIntl = document.getElementById('ev-intl-list');
    const evNat = document.getElementById('ev-nat-list');
    const natP = document.getElementById('nat-partners');
    const intlP = document.getElementById('intl-partners');

    if (hpg) {
      replaceChildren(hpg, pubs.slice(0, 4).map(createPubCard));
      hpg.dataset.loaded = '1';
    }
    if (hng) {
      replaceChildren(hng, news.slice(0, 6).map(createNewsCard));
      hng.dataset.loaded = '1';
    }
    if (pg) {
      replaceChildren(pg, pubs.map(createPubCard));
      pg.dataset.loaded = '1';
    }
    if (jg) {
      replaceChildren(jg, journals.map(createJournalCard));
      jg.dataset.loaded = '1';
    }
    if (evIntl) replaceChildren(evIntl, createEventYearGroups(getIntlEvents()));
    if (evNat) replaceChildren(evNat, createEventYearGroups(getNatEvents()));
    if (natP) replaceChildren(natP, getNatPartners().map(createPartnerCard));
    if (intlP) replaceChildren(intlP, getIntlPartners().map(createPartnerCard));
  });
}

/* ── PUBLICATION FILTER ──────────────────────────────── */
export function setPubType(type, btn) {
  currentPubType = type;
  document.querySelectorAll('#pub-filter .dept-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyPubFilter();
}

export function applyPubFilter() {
  const searchEl = document.getElementById('pub-search');
  const q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  const cards = document.querySelectorAll('#pub-grid .pub-card');
  const reduced = prefersReducedMotion();
  let visible = 0;

  cards.forEach(card => {
    const typeMatch = currentPubType === 'all' || card.dataset.type === currentPubType;
    const title = card.querySelector('.pub-meta-title');
    const dept = card.querySelector('.pub-meta-dept');
    const textMatch = !q
      || (title && title.textContent.toLowerCase().includes(q))
      || (dept && dept.textContent.toLowerCase().includes(q));
    const show = typeMatch && textMatch;

    if (show) {
      if (reduced) {
        card.style.display = '';
        card.style.opacity = '';
        card.style.transform = '';
      } else {
        if (card._hideTimer) { clearTimeout(card._hideTimer); card._hideTimer = null; }
        card.classList.add('visible');
        card.style.display = '';
        card.style.transition = 'none';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.96)';
        requestAnimationFrame(() => {
          card.style.transition = 'opacity 0.26s ease, transform 0.26s cubic-bezier(0.16,1,0.3,1)';
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
        });
      }
      visible++;
    } else if (reduced) {
      card.style.display = 'none';
    } else {
      card.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      card._hideTimer = setTimeout(() => { card.style.display = 'none'; card._hideTimer = null; }, 200);
    }
  });

  const countEl = document.getElementById('pub-count');
  if (countEl) countEl.textContent = visible > 0 ? `${visible} إصدار` : '';
  let noRes = document.getElementById('pub-no-results');
  if (!visible) {
    if (!noRes) {
      noRes = el('div', { className: 'pub-no-results', attrs: { id: 'pub-no-results' } });
      const grid = document.getElementById('pub-grid');
      if (grid) grid.appendChild(noRes);
    }
    noRes.textContent = getLang() === 'en' ? 'No publications match your search.' : 'لا توجد إصدارات تطابق بحثك.';
    noRes.style.display = '';
  } else if (noRes) {
    noRes.style.display = 'none';
  }
}

/* ── TABS ────────────────────────────────────────────── */
export function switchResearchTab(tabId) {
  document.querySelectorAll('#research-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  ['r1', 'r2', 'r3', 'r4'].forEach(id => {
    const panel = document.getElementById('rtab-' + id);
    if (panel) panel.classList.toggle('active', id === tabId);
  });
  updateTabIndicator(document.getElementById('research-tabs'));
}

export function switchEventsTab(tabId) {
  document.querySelectorAll('#page-events .tab-bar .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  const evIntl = document.getElementById('ev-intl');
  const evNat = document.getElementById('ev-nat');
  if (evIntl) evIntl.classList.toggle('active', tabId === 'intl');
  if (evNat) evNat.classList.toggle('active', tabId === 'nat');
  const evBar = document.querySelector('#page-events .tab-bar');
  if (evBar) updateTabIndicator(evBar);
}

export function updateTabIndicator(bar) {
  if (!bar) return;
  const active = bar.querySelector('.tab-btn.active');
  if (!active) return;
  const barRect = bar.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  bar.style.setProperty('--ind-left', (activeRect.left - barRect.left) + 'px');
  bar.style.setProperty('--ind-width', activeRect.width + 'px');
}

/* ── LIGHTBOX ────────────────────────────────────────── */
export function openLightbox(i) {
  const p = getPub(i);
  if (!p) return;
  document.getElementById('lb-title').textContent = p.t;
  document.getElementById('lb-dept').textContent = p.dept;
  document.getElementById('lb-year').textContent = p.type === 'collective' ? 'مؤلف جماعي' : 'مؤلف فردي';
  document.getElementById('lb-desc').textContent = p.desc;

  const coverHost = document.getElementById('lb-cover');
  const src = safeImageSrc(getCover(i));
  const img = el('img', {
    attrs: { src, alt: p.t || '' },
    style: {
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
      display: 'block',
      'border-radius': '6px',
    },
  });
  replaceChildren(coverHost, [img]);

  const overlay = document.getElementById('lightbox');
  requestAnimationFrame(() => overlay.classList.add('open'));
  setTimeout(() => {
    const closeBtn = overlay.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.focus();
  }, 320);
}

export function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
}

export function closeLightboxOutside(e) {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
}

/* ── CONTACT FORM ────────────────────────────────────── */
export function handleContactForm(e) {
  e.preventDefault();
  const nameInput = document.getElementById('f-name');
  const emailInput = document.getElementById('f-email');
  const subjectInput = document.getElementById('f-subject');
  const msgInput = document.getElementById('f-msg');
  let hasError = false;

  [nameInput, emailInput, subjectInput, msgInput].forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('input-error');
      hasError = true;
      setTimeout(() => input.classList.remove('input-error'), 400);
    }
  });
  if (hasError) return;

  const body = `من: ${nameInput.value.trim()}\nالبريد: ${emailInput.value.trim()}\n\n${msgInput.value.trim()}`;
  window.location.href =
    `mailto:contact@crsic.dz?subject=${encodeURIComponent(subjectInput.value.trim())}&body=${encodeURIComponent(body)}`;
  document.getElementById('form-success').style.display = 'block';
  e.target.reset();
  setTimeout(() => { document.getElementById('form-success').style.display = 'none'; }, 6000);
}

/* ── BREADCRUMB & BOTTOM TABS ────────────────────────── */
export function updateBreadcrumb(pageId) {
  const bar = document.getElementById('breadcrumbBar');
  if (!bar) return;
  const crumbs = BC_MAP[pageId] || [];
  if (pageId === 'home') { bar.classList.remove('visible'); return; }
  bar.classList.add('visible');

  const nodes = [
    el('a', {
      className: 'bc-item',
      text: t('bc_home'),
      attrs: { href: '#', 'data-page': 'home' },
    }),
  ];

  crumbs.forEach((c, i) => {
    nodes.push(el('span', { className: 'bc-sep', text: '›', attrs: { 'aria-hidden': 'true' } }));
    if (i === crumbs.length - 1) {
      nodes.push(el('span', { className: 'bc-item current', text: t(c.key) }));
    } else {
      nodes.push(el('a', {
        className: 'bc-item',
        text: t(c.key),
        attrs: { href: '#', 'data-page': c.page },
      }));
    }
  });

  replaceChildren(bar, nodes);
}

export function updateBottomTabs(pageId) {
  document.querySelectorAll('.bottom-tab[data-page]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === pageId);
  });
  const moreBtn = document.getElementById('moreTabBtn');
  if (moreBtn) moreBtn.classList.toggle('active', !BOTTOM_TAB_PAGES.includes(pageId));
}

/* ── DRAWER ──────────────────────────────────────────── */
export function openDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navOverlay');
  const toggle = document.getElementById('navToggle');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

export function closeDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navOverlay');
  const toggle = document.getElementById('navToggle');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ── UI EVENT BINDINGS ───────────────────────────────── */
export function bindUIEvents() {
  const researchTabs = document.getElementById('research-tabs');
  if (researchTabs) {
    researchTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn[data-tab]');
      if (!btn) return;
      switchResearchTab(btn.dataset.tab);
    });
  }

  const eventsBar = document.querySelector('#page-events .tab-bar');
  if (eventsBar) {
    eventsBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn[data-tab]');
      if (!btn) return;
      switchEventsTab(btn.dataset.tab);
    });
  }

  const pubFilter = document.getElementById('pub-filter');
  if (pubFilter) {
    pubFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.dept-tab[data-pub-type]');
      if (!btn) return;
      setPubType(btn.dataset.pubType, btn);
    });
  }

  const pubSearch = document.getElementById('pub-search');
  if (pubSearch) {
    pubSearch.addEventListener('input', applyPubFilter);
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', closeLightboxOutside);
    lightbox.querySelectorAll('.lightbox-close, .lb-btn-ghost').forEach(btn => {
      btn.addEventListener('click', closeLightbox);
    });
  }

  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-pub-index]');
    if (!card) return;
    const i = parseInt(card.dataset.pubIndex, 10);
    if (!Number.isNaN(i)) openLightbox(i);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const card = e.target.closest('[data-pub-index]');
    if (!card) return;
    const i = parseInt(card.dataset.pubIndex, 10);
    if (!Number.isNaN(i)) openLightbox(i);
  });

  const form = document.getElementById('contactForm') || document.querySelector('#page-contact form');
  if (form) form.addEventListener('submit', handleContactForm);

  const navToggle = document.getElementById('navToggle');
  const navOverlay = document.getElementById('navOverlay');
  const drawerClose = document.getElementById('drawerClose');
  const moreTabBtn = document.getElementById('moreTabBtn');
  if (navToggle) navToggle.addEventListener('click', openDrawer);
  if (navOverlay) navOverlay.addEventListener('click', closeDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (moreTabBtn) moreTabBtn.addEventListener('click', openDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLightbox(); closeDrawer(); }
  });

  // Keyboard: Enter/Space activate dept cards (role="button")
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.dept-card[data-page]');
    if (!card || e.target !== card) return;
    e.preventDefault();
    card.click();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.has-mega') && !e.target.closest('.has-dropdown')) {
      document.querySelectorAll('.has-mega, .has-dropdown').forEach(d => d.classList.remove('open'));
    }
  });
}
