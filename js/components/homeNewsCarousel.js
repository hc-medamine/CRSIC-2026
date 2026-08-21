/**
 * Home Center News — paged autoplay carousel (PRD 2026-08-21).
 */
import { cmsItemImageSrc } from '../data.js';
import { t } from '../i18n.js';
import { replaceChildren, safeImageSrc, prefersReducedMotion } from '../utils.js';
import { createNewsCard } from './newsCard.js';
import {
  HOME_NEWS_PAGE_SIZE,
  homeNewsPageCount,
  homeNewsPageItems,
  wrapNewsPageIndex,
} from '../homeNewsPages.js';

const DWELL_MS = 5000;
const FADE_MS = 320;
const SWIPE_PX = 48;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** @type {(() => void) | null} */
let dispose = null;

/**
 * @param {'pause'|'play'} name
 * @returns {SVGSVGElement}
 */
function pausePlayIcon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    name === 'play' ? 'M8 5v14l11-7z' : 'M6 5h4v14H6zm8 0h4v14h-4z',
  );
  svg.appendChild(path);
  return svg;
}

/**
 * @param {HTMLButtonElement} btn
 * @param {'pause'|'play'} name
 */
function setPauseButton(btn, name) {
  replaceChildren(btn, [pausePlayIcon(name)]);
  btn.setAttribute('aria-label', t(name === 'play' ? 'home_news_play' : 'home_news_pause'));
  btn.classList.toggle('is-paused', name === 'play');
}

/**
 * @param {object[]} items
 */
function prefetchImages(items) {
  items.forEach((n) => {
    const src = safeImageSrc(cmsItemImageSrc(n));
    if (!src) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
}

function isRtl() {
  return (document.documentElement.getAttribute('dir') || 'rtl') === 'rtl';
}

/** Pause-on-hover only for the card itself, not grid gaps. */
function eventOnNewsCard(e) {
  const el = e && e.target;
  return Boolean(el && el.closest && el.closest('.news-card'));
}

function relatedOnNewsCard(e) {
  const el = e && e.relatedTarget;
  return Boolean(el && el.closest && el.closest('.news-card'));
}

/**
 * @param {HTMLElement | null} grid
 * @param {object[]} news
 */
export function mountHomeNewsCarousel(grid, news) {
  if (dispose) {
    dispose();
    dispose = null;
  }
  if (!grid) return;

  const list = Array.isArray(news) ? news : [];
  const section = grid.closest('.news-section') || grid.parentElement;
  const pauseBtn = document.getElementById('home-news-pause');
  const reduce = prefersReducedMotion();
  const pages = homeNewsPageCount(list.length);
  const carousel = pages > 1 && !reduce;

  grid.classList.toggle('home-news-grid--carousel', carousel);

  if (pauseBtn) {
    pauseBtn.hidden = !carousel;
    if (!carousel) {
      pauseBtn.setAttribute('aria-hidden', 'true');
    } else {
      pauseBtn.removeAttribute('aria-hidden');
    }
  }

  if (!carousel) {
    replaceChildren(
      grid,
      list.slice(0, HOME_NEWS_PAGE_SIZE).map((n, i) => createNewsCard(n, i)),
    );
    return;
  }

  let index = 0;
  let stickyPaused = false;
  let hovering = false;
  let pressing = false;
  let focusing = false;
  let introPending = true;
  let dwellTimer = null;
  let fadeGen = 0;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let swiping = false;
  let suppressClick = false;

  function holding() {
    return hovering || pressing || focusing;
  }

  function paint() {
    const slice = homeNewsPageItems(list, index);
    const base = index * HOME_NEWS_PAGE_SIZE;
    replaceChildren(
      grid,
      slice.map((n, i) => createNewsCard(n, base + i)),
    );
  }

  function prefetchNext() {
    const next = wrapNewsPageIndex(index + 1, pages);
    prefetchImages(homeNewsPageItems(list, next));
  }

  function sectionInView() {
    if (!section || typeof section.getBoundingClientRect !== 'function') return false;
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    return r.bottom > 0 && r.top < vh;
  }

  let inView = sectionInView();

  function stopDwell() {
    if (dwellTimer) {
      clearInterval(dwellTimer);
      dwellTimer = null;
    }
  }

  function startDwell() {
    stopDwell();
    if (stickyPaused || reduce || !inView || holding()) return;
    if (introPending) {
      introPending = false;
      void goTo(index + 1, true);
    }
    dwellTimer = setInterval(() => {
      void goTo(index + 1, true);
    }, DWELL_MS);
  }

  async function goTo(nextIndex, animate) {
    const gen = ++fadeGen;
    index = wrapNewsPageIndex(nextIndex, pages);
    if (animate && !reduce) {
      grid.classList.add('is-fading');
      await new Promise((r) => setTimeout(r, FADE_MS));
      if (gen !== fadeGen) return;
    }
    paint();
    prefetchNext();
    if (animate && !reduce) {
      requestAnimationFrame(() => {
        if (gen === fadeGen) grid.classList.remove('is-fading');
      });
    }
  }

  function nextPage() {
    introPending = false;
    void goTo(index + 1, true);
    if (!stickyPaused && inView && !holding()) startDwell();
  }

  function prevPage() {
    introPending = false;
    void goTo(index - 1, true);
    if (!stickyPaused && inView && !holding()) startDwell();
  }

  function onKeydown(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const rtl = isRtl();
    e.preventDefault();
    if (e.key === 'ArrowLeft') {
      if (rtl) nextPage();
      else prevPage();
    } else if (rtl) prevPage();
    else nextPage();
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    swiping = false;
    if (eventOnNewsCard(e)) {
      pressing = true;
      stopDwell();
    }
    try {
      grid.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (pointerId !== e.pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!swiping && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      swiping = true;
      suppressClick = true;
    }
  }

  function onPointerUp(e) {
    if (pointerId !== e.pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const rtl = isRtl();
    const wasPressing = pressing;
    pressing = false;
    pointerId = null;
    try {
      grid.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (swiping && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      const goNext = rtl ? dx > 0 : dx < 0;
      if (goNext) nextPage();
      else prevPage();
    } else if (wasPressing && !stickyPaused) {
      startDwell();
    }
    swiping = false;
  }

  function onClickCapture(e) {
    if (!suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  }

  function onPointerOver(e) {
    if (!eventOnNewsCard(e) || relatedOnNewsCard(e)) return;
    hovering = true;
    stopDwell();
  }

  function onPointerOut(e) {
    if (!eventOnNewsCard(e) || relatedOnNewsCard(e)) return;
    hovering = false;
    if (stickyPaused) return;
    startDwell();
  }

  function onFocusIn(e) {
    if (!eventOnNewsCard(e)) return;
    focusing = true;
    stopDwell();
  }

  function onFocusOut(e) {
    if (!focusing) return;
    if (relatedOnNewsCard(e)) return;
    focusing = false;
    if (stickyPaused) return;
    startDwell();
  }

  function syncPauseButton() {
    if (!pauseBtn) return;
    setPauseButton(pauseBtn, stickyPaused ? 'play' : 'pause');
  }

  function onPauseClick() {
    stickyPaused = !stickyPaused;
    syncPauseButton();
    if (stickyPaused) {
      stopDwell();
    } else if (inView && !holding()) {
      startDwell();
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      inView = Boolean(entry && entry.isIntersecting);
      if (!inView) {
        stopDwell();
        return;
      }
      if (stickyPaused || holding()) return;
      startDwell();
    },
    { threshold: 0 },
  );

  paint();
  prefetchNext();
  syncPauseButton();

  section.addEventListener('keydown', onKeydown);
  grid.addEventListener('pointerdown', onPointerDown);
  grid.addEventListener('pointermove', onPointerMove);
  grid.addEventListener('pointerup', onPointerUp);
  grid.addEventListener('pointercancel', onPointerUp);
  grid.addEventListener('click', onClickCapture, true);
  grid.addEventListener('pointerover', onPointerOver);
  grid.addEventListener('pointerout', onPointerOut);
  grid.addEventListener('focusin', onFocusIn);
  grid.addEventListener('focusout', onFocusOut);
  if (pauseBtn) pauseBtn.addEventListener('click', onPauseClick);
  io.observe(section);

  startDwell();

  dispose = () => {
    fadeGen += 1;
    stopDwell();
    io.disconnect();
    section.removeEventListener('keydown', onKeydown);
    grid.removeEventListener('pointerdown', onPointerDown);
    grid.removeEventListener('pointermove', onPointerMove);
    grid.removeEventListener('pointerup', onPointerUp);
    grid.removeEventListener('pointercancel', onPointerUp);
    grid.removeEventListener('click', onClickCapture, true);
    grid.removeEventListener('pointerover', onPointerOver);
    grid.removeEventListener('pointerout', onPointerOut);
    grid.removeEventListener('focusin', onFocusIn);
    grid.removeEventListener('focusout', onFocusOut);
    if (pauseBtn) pauseBtn.removeEventListener('click', onPauseClick);
    grid.classList.remove('home-news-grid--carousel', 'is-fading');
    grid.style.minHeight = '';
  };
}

export function unmountHomeNewsCarousel() {
  if (dispose) {
    dispose();
    dispose = null;
  }
}
