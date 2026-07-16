/**
 * Animation controllers: scroll reveal, counters, tilt, observers, reduced-motion.
 */
import { prefersReducedMotion } from './utils.js';
import { updateTabIndicator } from './ui.js';

let titleObserver = null;

/** @returns {IntersectionObserver|null} */
export function getTitleObserver() {
  return titleObserver;
}

/* ── [ANIM 4.6] SCROLL REVEAL ────────────────────────── */
function initScrollReveal() {
  if (prefersReducedMotion()) return;

  const SELECTORS = [
    '.dept-card', '.pub-card', '.ev-card', '.partner-card',
    '.c-card', '.team-card', '.journal-card', '.news-card', '.c-card-accent'
  ].join(', ');

  const cards = document.querySelectorAll(SELECTORS);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -30px 0px'
  });

  cards.forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

/* ── [ANIM 4.7] STAT COUNTERS ────────────────────────── */
function initStatCounters() {
  if (prefersReducedMotion()) return;
  const bar = document.querySelector('.stats-bar');
  if (!bar) return;

  const nums = bar.querySelectorAll('.stat-num');
  const targets = Array.from(nums).map(el => {
    const raw = el.textContent.trim().replace(/\+/g, '');
    return { el, target: parseInt(raw, 10) || 0, suffix: el.textContent.includes('+') ? '+' : '' };
  });

  function animateCount(el, from, to, suffix, duration) {
    const start = performance.now();
    (function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      el.textContent = suffix + Math.round(from + (to - from) * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = suffix + to;
      }
    })(start);
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      targets.forEach(({ el, target, suffix }) => {
        const from = target > 1000 ? target - 8 : 0;
        animateCount(el, from, target, suffix, 1400);
      });
      observer.disconnect();
    }
  }, { threshold: 0.5 });

  observer.observe(bar);
}

/* ── [ANIM A1] SCROLL PROGRESS ───────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('scrollProgressBar');
  if (!bar) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrolled / docHeight : 0;
        bar.style.transform = `scaleX(${progress})`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── [ANIM A2] NAV SHRINK ────────────────────────────── */
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

/* ── [ANIM A4] MAGNETIC BUTTONS ──────────────────────── */
function initMagneticButtons() {
  const STRENGTH = 0.35;
  const MAX_DIST = 80;
  document.querySelectorAll('.btn-primary-cta, .btn-ghost-cta').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < MAX_DIST) {
        btn.style.setProperty('--mag-x', (dx * STRENGTH).toFixed(1) + 'px');
        btn.style.setProperty('--mag-y', (dy * STRENGTH).toFixed(1) + 'px');
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('--mag-x', '0px');
      btn.style.setProperty('--mag-y', '0px');
    });
  });
}

/* ── [ANIM A5] HERO CURSOR GLOW ──────────────────────── */
function initHeroCursorGlow() {
  const hero = document.querySelector('.hero-main');
  if (!hero) return;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
    hero.style.setProperty('--glow-x', x);
    hero.style.setProperty('--glow-y', y);
  });
  hero.addEventListener('mouseleave', () => {
    hero.style.setProperty('--glow-x', '50%');
    hero.style.setProperty('--glow-y', '50%');
  });
}

/* ── [ANIM A6] RIPPLE ────────────────────────────────── */
function initRippleEffect() {
  if (prefersReducedMotion()) return;
  const TARGETS = '.btn-primary-cta, .btn-ghost-cta, .nav-util-btn, .nav-cta, .tab-btn, .dept-tab';
  document.addEventListener('click', (e) => {
    const btn = e.target.closest(TARGETS);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.top = (e.clientY - rect.top) + 'px';
    wave.style.left = (e.clientX - rect.left) + 'px';
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  });
}

/* ── [ANIM A8] BACK-TO-TOP ───────────────────────────── */
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

/* ── [ANIM A9] TITLE UNDERLINE ───────────────────────── */
function initTitleUnderline() {
  if (prefersReducedMotion()) return;
  const titles = document.querySelectorAll('.section-title');
  titleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('drawn');
        titleObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  titles.forEach(titleEl => titleObserver.observe(titleEl));
}

/* ── [ANIM A10] PAGE-HERO PARALLAX ───────────────────── */
function initParallaxHero() {
  if (prefersReducedMotion()) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const hero = document.querySelector('.page.active .page-hero-inner');
        if (hero) {
          const max = Math.min(window.scrollY * 0.28, 120);
          hero.style.setProperty('--parallax-y', max.toFixed(1) + 'px');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── [ANIM EXTRA] STAT SHIMMER ───────────────────────── */
function initStatShimmer() {
  if (prefersReducedMotion()) return;
  const statsBar = document.querySelector('.stats-bar');
  if (!statsBar) return;
  const obs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    const stats = statsBar.querySelectorAll('.stat');
    stats.forEach((stat, i) => {
      setTimeout(() => {
        stat.classList.add('shimmer');
        setTimeout(() => stat.classList.remove('shimmer'), 950);
      }, i * 180);
    });
    obs.disconnect();
  }, { threshold: 0.5 });
  obs.observe(statsBar);
}

/* ── [ANIM A3] 3D TILT via MutationObserver ──────────── */
function watchForNewCards() {
  if (prefersReducedMotion()) return;
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
        card.style.setProperty('--tilt-x', (-dy * TILT_MAX).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', (dx * TILT_MAX).toFixed(2) + 'deg');
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
}

/**
 * Boot all animation systems after DOM cards exist (short delay for rAF render).
 */
export function initAnimations() {
  setTimeout(() => {
    initScrollReveal();
    initStatCounters();
    const researchBar = document.getElementById('research-tabs');
    const eventsBar = document.querySelector('#page-events .tab-bar');
    if (researchBar && researchBar.closest('.page.active')) updateTabIndicator(researchBar);
    if (eventsBar && eventsBar.closest('.page.active')) updateTabIndicator(eventsBar);
    initRound2Animations();
  }, 120);

  watchForNewCards();
}
