/**
 * Featured home news carousel (curated playlist, max 10) — CRSIC brand, vanilla JS.
 */
import { cmsItemImageSrc, getFeaturedNewsIds, getNews } from '../data.js';
import { newsResume, resolveFeaturedNews } from '../featuredNews.js';
import { t } from '../i18n.js';
import { el, replaceChildren, safeImageSrc, prefersReducedMotion } from '../utils.js';

const HOLDER = [
  'img/Holders/0.jpg',
  'img/Holders/1.jpg',
  'img/Holders/2.jpg',
];

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {'prev'|'next'|'pause'|'play'} name
 * @returns {SVGSVGElement}
 */
function controlIcon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  const d =
    name === 'prev'
      ? 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'
      : name === 'next'
        ? 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
        : name === 'play'
          ? 'M8 5v14l11-7z'
          : 'M6 5h4v14H6zm8 0h4v14h-4z';
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}

/**
 * @param {HTMLButtonElement} btn
 * @param {'prev'|'next'|'pause'|'play'} name
 * @param {string} label
 */
function setControl(btn, name, label) {
  replaceChildren(btn, [controlIcon(name)]);
  btn.setAttribute('aria-label', label);
}

/**
 * @param {object} item
 * @param {number} i
 * @returns {string}
 */
function newsImageSrc(item, i) {
  const fromCms = safeImageSrc(cmsItemImageSrc(item));
  if (fromCms) return fromCms;
  return safeImageSrc(HOLDER[i % HOLDER.length] || '');
}

/**
 * Ensure each slide gets a distinct image when items reuse placeholders.
 * @param {object[]} items
 * @returns {string[]}
 */
function uniqueSlideImages(items) {
  const used = new Set();
  const extras = [
    'img/Holders/0.jpg',
    'img/Holders/1.jpg',
    'img/Holders/2.jpg',
    'img/Holders/3.jpg',
    'img/Holders/4.jpg',
    'img/Holders/5.jpg',
  ];
  return items.map((item, i) => {
    let src = newsImageSrc(item, i);
    if (src && !used.has(src)) {
      used.add(src);
      return src;
    }
    const alt = extras.find((h) => {
      const safe = safeImageSrc(h);
      return safe && !used.has(safe);
    });
    const next = alt ? safeImageSrc(alt) : src;
    if (next) used.add(next);
    return next || '';
  });
}

/**
 * @param {HTMLElement} root
 */
export function mountFeaturedCarousel(root) {
  if (!root) return;
  const items = resolveFeaturedNews(getNews(), getFeaturedNewsIds());
  if (!items.length) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  let index = 0;
  let timer = null;
  const reduce = prefersReducedMotion();
  const slideImages = uniqueSlideImages(items);

  const track = el('div', {
    className: 'feat-carousel-track',
    attrs: {
      role: 'list',
      'aria-live': 'polite',
    },
  });
  const slides = items.map((item, i) => {
    const imgSrc = slideImages[i] || '';
    const title = item.title || '';
    const summary = newsResume(item);
    const slug = item.slug || item.id || '';
    const slide = el('div', {
      className: 'feat-carousel-slide' + (i === 0 ? ' is-active' : ''),
      attrs: {
        role: 'listitem',
        'aria-hidden': i === 0 ? 'false' : 'true',
      },
    });
    if (imgSrc) {
      slide.appendChild(
        el('img', {
          className: 'feat-carousel-media',
          attrs: {
            src: imgSrc,
            alt: title,
            loading: i === 0 ? 'eager' : 'lazy',
            decoding: 'async',
          },
        }),
      );
    }
    const inner = el('div', {
      className: 'feat-carousel-inner',
    });
    inner.append(
      el('p', { className: 'feat-carousel-kicker', text: t('feat_carousel_kicker') }),
      el('h2', { className: 'feat-carousel-title', text: title }),
      el('p', { className: 'feat-carousel-summary', text: summary }),
    );
    if (slug) {
      inner.append(
        el('a', {
          className: 'feat-carousel-cta',
          text: t('feat_carousel_cta'),
          attrs: { href: `#news/${encodeURIComponent(slug)}` },
        }),
      );
    }
    slide.appendChild(inner);
    return slide;
  });
  slides.forEach((s) => track.appendChild(s));

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, j) => {
      const on = j === index;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    if (dots) {
      [...dots.children].forEach((d, j) => d.classList.toggle('is-active', j === index));
    }
  }

  function next() { show(index + 1); }
  function prev() { show(index - 1); }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function start() {
    stop();
    if (reduce || slides.length < 2) return;
    timer = setInterval(next, 7000);
  }

  const controls = el('div', { className: 'feat-carousel-controls' });
  const prevBtn = el('button', {
    className: 'feat-carousel-btn feat-carousel-btn--prev',
    attrs: { type: 'button' },
  });
  const nextBtn = el('button', {
    className: 'feat-carousel-btn feat-carousel-btn--next',
    attrs: { type: 'button' },
  });
  const pauseBtn = el('button', {
    className: 'feat-carousel-btn feat-carousel-pause feat-carousel-btn--play',
    attrs: { type: 'button' },
  });
  setControl(prevBtn, 'prev', t('feat_carousel_prev'));
  setControl(nextBtn, 'next', t('feat_carousel_next'));
  setControl(pauseBtn, 'pause', t('feat_carousel_pause'));

  let paused = reduce;
  if (paused) {
    pauseBtn.classList.add('is-paused');
    setControl(pauseBtn, 'play', t('feat_carousel_play'));
  }

  prevBtn.addEventListener('click', () => { prev(); if (!paused) start(); });
  nextBtn.addEventListener('click', () => { next(); if (!paused) start(); });
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    if (paused) {
      stop();
      pauseBtn.classList.add('is-paused');
      setControl(pauseBtn, 'play', t('feat_carousel_play'));
    } else {
      start();
      pauseBtn.classList.remove('is-paused');
      setControl(pauseBtn, 'pause', t('feat_carousel_pause'));
    }
  });
  controls.append(prevBtn, pauseBtn, nextBtn);

  const dots = el('div', { className: 'feat-carousel-dots', attrs: { role: 'tablist' } });
  items.forEach((_, i) => {
    const d = el('button', {
      className: 'feat-carousel-dot' + (i === 0 ? ' is-active' : ''),
      attrs: { type: 'button', 'aria-label': `${i + 1}` },
    });
    d.addEventListener('click', () => { show(i); if (!paused) start(); });
    dots.appendChild(d);
  });

  root.setAttribute('dir', document.documentElement.getAttribute('dir') || 'rtl');
  replaceChildren(root, [track, controls, dots]);
  if (!paused) start();
}
