/**
 * Bi-directional motion controllers: scroll reveal, stagger, counters,
 * hero/nav polish. Transform + opacity only; respects prefers-reduced-motion.
 */
import { el, prefersReducedMotion } from './utils.js';
import { updateTabIndicator } from './ui.js';

let titleObserver = null;
let revealObserver = null;
let sectionObserver = null;

/** @returns {IntersectionObserver|null} */
export function getTitleObserver() {
  return titleObserver;
}

const CARD_SELECTORS = [
  '.dept-card',
  '.pub-card',
  '.ev-card',
  '.event-row',
  '.partner-card',
  '.c-card',
  '.team-card',
  '.journal-card',
  '.news-card',
  '.c-card-accent',
  '.catalog-card',
].join(', ');

const SECTION_SELECTORS = [
  '.news-section',
  '.events',
  '.departments',
  '.publications',
  '.stats-bar',
  '.feat-carousel-shell',
  '.page-body',
].join(', ');

/**
 * @returns {string}
 */
function docDir() {
  return document.documentElement.getAttribute('dir') || 'rtl';
}

/**
 * Format count for display — always Latin digits (even in RTL/Arabic UI).
 * @param {number} n
 * @param {string} prefix  e.g. '+' or ''
 * @returns {string}
 */
function formatStatNumber(n, prefix) {
  return prefix + String(Math.round(n));
}

/**
 * Assign --reveal-index for stagger (DOM order = visual reading order in both dirs).
 * @param {Element[]} items
 */
function assignRevealIndices(items) {
  items.forEach((el, i) => {
    el.style.setProperty('--reveal-index', String(i));
    el.classList.add('reveal');
  });
}

/* ── SCROLL REVEAL (cards + sections) ────────────────── */
function initScrollReveal() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }
  if (sectionObserver) {
    sectionObserver.disconnect();
    sectionObserver = null;
  }

  if (prefersReducedMotion()) {
    document.querySelectorAll(CARD_SELECTORS + ', ' + SECTION_SELECTORS).forEach((el) => {
      el.classList.add('reveal', 'visible', 'is-revealed');
      if (el.matches(SECTION_SELECTORS)) el.classList.add('reveal-section', 'is-revealed');
    });
    return;
  }

  const cards = Array.from(document.querySelectorAll(CARD_SELECTORS))
    .filter((el) => el.offsetParent !== null || el.getClientRects().length);

  /* Group siblings under shared parents for stagger indices */
  const byParent = new Map();
  cards.forEach((el) => {
    const parent = el.parentElement || document.body;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(el);
  });
  byParent.forEach((group, parent) => {
    parent.classList.add('reveal-stagger');
    assignRevealIndices(group);
  });

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible', 'is-revealed');
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -30px 0px',
  });

  cards.forEach((el) => revealObserver.observe(el));

  const sections = Array.from(document.querySelectorAll(SECTION_SELECTORS));
  sections.forEach((el) => el.classList.add('reveal-section'));

  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      sectionObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  sections.forEach((el) => sectionObserver.observe(el));
}

/** Re-bind reveals after dynamic renders (lang switch, SPA filters). */
export function refreshMotionReveals() {
  initScrollReveal();
  initDirectorWordMotion();
}

/* ── DIRECTOR WORD (About) staged entrance ───────────── */
function initDirectorWordMotion() {
  const root = document.querySelector('[data-director-motion]');
  if (!root) return;

  if (prefersReducedMotion()) {
    root.classList.add('is-director-in');
    return;
  }

  if (root.classList.contains('is-director-in')) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-director-in');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.28,
    rootMargin: '0px 0px -8% 0px',
  });

  observer.observe(root);
}

/* ── STAT COUNTERS (1.5s ease-out-expo) ──────────────── */
function initStatCounters() {
  const bar = document.querySelector('.stats-bar');
  if (!bar || bar.dataset.countDone === '1') return;

  const nums = bar.querySelectorAll('.stat-num');
  const targets = Array.from(nums).map((el) => {
    const raw = (el.dataset.countTarget || el.textContent || '').trim();
    const hasPlus = raw.includes('+') || (el.textContent || '').includes('+');
    const digits = raw.replace(/[^\d]/g, '');
    const target = parseInt(digits, 10) || 0;
    if (!el.dataset.countTarget) el.dataset.countTarget = (hasPlus ? '+' : '') + target;
    return { el, target, prefix: hasPlus ? '+' : '' };
  });

  if (prefersReducedMotion()) {
    targets.forEach(({ el, target, prefix }) => {
      el.textContent = formatStatNumber(target, prefix);
    });
    bar.dataset.countDone = '1';
    return;
  }

  function animateCount(el, from, to, prefix, duration) {
    const start = performance.now();
    (function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      /* ease-out exponential ≈ expo */
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      el.textContent = formatStatNumber(from + (to - from) * eased, prefix);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatStatNumber(to, prefix);
    })(start);
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries[0] || !entries[0].isIntersecting) return;
    targets.forEach(({ el, target, prefix }) => {
      const from = target > 1000 ? Math.max(0, target - 12) : 0;
      animateCount(el, from, target, prefix, 2200);
    });
    bar.dataset.countDone = '1';
    observer.disconnect();
  }, { threshold: 0.45 });

  observer.observe(bar);
}

/* ── SCROLL PROGRESS ─────────────────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('scrollProgressBar');
  if (!bar) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrolled = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrolled / docHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
      /* Grow from inline-start */
      bar.style.transformOrigin = docDir() === 'rtl' ? 'right center' : 'left center';
      ticking = false;
    });
  }, { passive: true });
}

/* ── NAV SHRINK ──────────────────────────────────────── */
function initNavShrink() {
  const nav = document.querySelector('nav.site-nav');
  if (!nav) return;
  let lastScrolled = false;
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const shouldShrink = currentScrollY > 60;
    if (shouldShrink !== lastScrolled) {
      nav.classList.toggle('scrolled', shouldShrink);
      lastScrolled = shouldShrink;
    }
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      nav.classList.add('hidden-up');
    } else if (currentScrollY < lastScrollY) {
      nav.classList.remove('hidden-up');
    }
    lastScrollY = currentScrollY;
  }, { passive: true });
}

/* ── MAGNETIC BUTTONS ────────────────────────────────── */
function initMagneticButtons() {
  if (prefersReducedMotion()) return;
  const STRENGTH = 0.35;
  const MAX_DIST = 80;
  document.querySelectorAll('.btn-primary-cta, .btn-ghost-cta').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      if (Math.hypot(dx, dy) < MAX_DIST) {
        btn.style.setProperty('--mag-x', `${(dx * STRENGTH).toFixed(1)}px`);
        btn.style.setProperty('--mag-y', `${(dy * STRENGTH).toFixed(1)}px`);
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('--mag-x', '0px');
      btn.style.setProperty('--mag-y', '0px');
    });
  });
}

/* ── HERO CURSOR GLOW ────────────────────────────────── */
function initHeroCursorGlow() {
  if (prefersReducedMotion()) return;
  const hero = document.querySelector('.hero-main');
  if (!hero) return;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty('--glow-x', `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
    hero.style.setProperty('--glow-y', `${((e.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
  });
  hero.addEventListener('mouseleave', () => {
    hero.style.setProperty('--glow-x', '50%');
    hero.style.setProperty('--glow-y', '50%');
  });
}

/* ── RIPPLE ──────────────────────────────────────────── */
function initRippleEffect() {
  if (prefersReducedMotion()) return;
  const TARGETS = '.btn-primary-cta, .btn-ghost-cta, .nav-util-btn, .nav-cta, .tab-btn, .dept-tab, .filter-chip';
  document.addEventListener('click', (e) => {
    const btn = e.target.closest(TARGETS);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.top = `${e.clientY - rect.top}px`;
    wave.style.left = `${e.clientX - rect.left}px`;
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  });
}

/* ── BACK-TO-TOP ─────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  let visible = false;
  window.addEventListener('scroll', () => {
    const shouldShow = window.scrollY > 400;
    if (shouldShow !== visible) {
      btn.classList.toggle('visible', shouldShow);
      visible = shouldShow;
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  });
}

/* ── TITLE UNDERLINE ─────────────────────────────────── */
function initTitleUnderline() {
  if (prefersReducedMotion()) return;
  const titles = document.querySelectorAll('.section-title');
  titleObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('drawn');
      titleObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  titles.forEach((titleEl) => titleObserver.observe(titleEl));
}

/* ── PAGE-HERO PARALLAX ──────────────────────────────── */
function initParallaxHero() {
  if (prefersReducedMotion()) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const hero = document.querySelector('.page.active .page-hero-inner');
      if (hero) {
        const max = Math.min(window.scrollY * 0.28, 120);
        hero.style.setProperty('--parallax-y', `${max.toFixed(1)}px`);
        hero.classList.toggle('is-parallaxing', max > 0.5);
      } else {
        document.querySelectorAll('.page-hero-inner.is-parallaxing')
          .forEach((el) => el.classList.remove('is-parallaxing'));
      }
      ticking = false;
    });
  }, { passive: true });
}

/* ── STAT SHIMMER ────────────────────────────────────── */
function initStatShimmer() {
  if (prefersReducedMotion()) return;
  const statsBar = document.querySelector('.stats-bar');
  if (!statsBar) return;
  const obs = new IntersectionObserver((entries) => {
    if (!entries[0] || !entries[0].isIntersecting) return;
    statsBar.querySelectorAll('.stat').forEach((stat, i) => {
      setTimeout(() => {
        stat.classList.add('shimmer');
        setTimeout(() => stat.classList.remove('shimmer'), 950);
      }, i * 180);
    });
    obs.disconnect();
  }, { threshold: 0.5 });
  obs.observe(statsBar);
}

/* ── 3D TILT ─────────────────────────────────────────── */
function watchForNewCards() {
  if (prefersReducedMotion()) return;
  if (typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    return;
  }
  const TILT_MAX = 7;
  const tiltSelector = '.pub-card:not([data-tilt]), .journal-card:not([data-tilt])';

  function armTilt(card) {
    card.dataset.tilt = '1';
    let rafId = null;
    card.addEventListener('mousemove', (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        card.style.setProperty('--tilt-x', `${(-dy * TILT_MAX).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(dx * TILT_MAX).toFixed(2)}deg`);
      });
    });
    card.addEventListener('mouseleave', () => {
      if (rafId) cancelAnimationFrame(rafId);
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  }

  const appEl = document.getElementById('app');
  if (!appEl) return;
  const mo = new MutationObserver(() => {
    document.querySelectorAll(tiltSelector).forEach(armTilt);
  });
  mo.observe(appEl, { childList: true, subtree: true });
  document.querySelectorAll(tiltSelector).forEach(armTilt);
}

/**
 * Home pub carousel — thin progress track under the scroll-snap strip.
 * Mirrors horizontal position (direction-agnostic: active card found by
 * centre proximity; thumb mirrors physically in RTL) and lets users jump
 * pages by tapping the track. Usable under reduced-motion (snaps, no anim).
 */
function initPubCarouselTrack() {
  const grid = document.getElementById('home-pub-grid');
  if (!grid) return;
  const mq = window.matchMedia('(max-width: 768px)');
  let track = null;

  const getCards = () => Array.from(grid.querySelectorAll('.pub-card'));

  const build = () => {
    const existing = grid.parentElement && grid.parentElement.querySelector('.pub-carousel-track');
    if (existing) existing.remove();
    track = null;
    if (!mq.matches) return;

    const cards = getCards();
    if (cards.length < 2) return;

    track = el('div', {
      className: 'pub-carousel-track',
      attrs: { 'aria-hidden': 'true' },
    });
    const fill = el('div', { className: 'pub-carousel-track-fill' });
    const thumb = el('div', { className: 'pub-carousel-track-thumb' });
    fill.appendChild(thumb);
    track.appendChild(fill);
    grid.insertAdjacentElement('afterend', track);

    const perPage = Math.max(
      1,
      Math.round(grid.clientWidth / (cards[0].getBoundingClientRect().width + 12)),
    );
    const maxIdx = Math.max(1, cards.length - perPage);
    const thumbW = (perPage / cards.length) * 100;

    const paint = (activeIdx) => {
      const frac = Math.min(1, activeIdx / maxIdx);
      const travel = track.clientWidth - (thumbW / 100) * track.clientWidth;
      thumb.style.width = thumbW + '%';
      thumb.style.transform =
        'translateX(' + (docDir() === 'rtl' ? 1 - frac : frac) * travel + 'px)';
    };

    const sync = () => {
      const gridRect = grid.getBoundingClientRect();
      if (gridRect.width === 0) return;
      const center = gridRect.left + gridRect.width / 2;
      let idx = 0;
      let best = Infinity;
      getCards().forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - center);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      paint(Math.min(maxIdx, idx));
    };

    let ticking = false;
    grid.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          sync();
        });
      },
      { passive: true },
    );

    track.addEventListener('click', (e) => {
      const r = track.getBoundingClientRect();
      if (r.width === 0) return;
      let frac = (e.clientX - r.left) / r.width;
      if (docDir() === 'rtl') frac = 1 - frac;
      frac = Math.min(1, Math.max(0, frac));
      const idx = Math.min(getCards().length - 1, Math.round(frac * maxIdx));
      getCards()[idx].scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    });

    sync();
  };

  build();
  mq.addEventListener('change', build);
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });
}

function initRound2Animations() {
  const reduced = prefersReducedMotion();
  initScrollProgress();
  initNavShrink();
  if (!reduced) {
    initMagneticButtons();
    initHeroCursorGlow();
  }
  initRippleEffect();
  initBackToTop();
  initTitleUnderline();
  initParallaxHero();
  initStatShimmer();
  initPubCarouselTrack();
}

/**
 * Boot all animation systems after DOM cards exist.
 */
export function initAnimations() {
  setTimeout(() => {
    initScrollReveal();
    initDirectorWordMotion();
    initStatCounters();
    const researchBar = document.getElementById('research-tabs');
    const eventsBar = document.querySelector('#page-events .tab-bar');
    if (researchBar && researchBar.closest('.page.active')) updateTabIndicator(researchBar);
    if (eventsBar && eventsBar.closest('.page.active')) updateTabIndicator(eventsBar);
    initRound2Animations();
  }, 120);

  watchForNewCards();
}
