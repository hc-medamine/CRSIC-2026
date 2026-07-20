/**
 * Content detail page renderer (news / event / publication).
 * Plain-text body only — no innerHTML for editorial fields.
 */
import { getLang, t } from '../i18n.js';
import { el, replaceChildren, safeImageSrc } from '../utils.js';
import {
  findNewsByKey,
  findEventByKey,
  findPublicationByKey,
  getCoverForPub,
} from '../data.js';

/**
 * @param {string} text
 * @returns {HTMLElement[]}
 */
function paragraphsFromPlainText(text) {
  const chunks = String(text || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length === 0 && text && String(text).trim()) {
    return [el('p', { className: 'detail-body-p', text: String(text).trim() })];
  }
  return chunks.map((chunk) => el('p', { className: 'detail-body-p', text: chunk }));
}

/**
 * @param {object[]} media
 * @param {string} title
 * @returns {HTMLElement|null}
 */
function buildMediaStage(media, title) {
  const list = Array.isArray(media) ? media : [];
  const images = list.filter((m) => m && m.kind === 'image' && m.src);
  const pdfs = list.filter((m) => m && m.kind === 'pdf' && m.src);

  if (images.length === 0 && pdfs.length === 0) return null;

  const children = [];

  if (images.length === 1) {
    const src = safeImageSrc(images[0].src);
    if (src) {
      children.push(
        el('div', {
          className: 'detail-hero',
          children: [
            el('img', {
              className: 'detail-hero-img',
              attrs: { src, alt: images[0].alt || title || '', loading: 'lazy' },
            }),
          ],
        }),
      );
    }
  } else if (images.length > 1) {
    children.push(
      el('div', {
        className: 'detail-gallery',
        attrs: { role: 'list', 'aria-label': t('detail_gallery') },
        children: images.map((img) => {
          const src = safeImageSrc(img.src);
          return el('div', {
            className: 'detail-gallery-item',
            attrs: { role: 'listitem' },
            children: src
              ? [
                  el('img', {
                    attrs: { src, alt: img.alt || title || '', loading: 'lazy' },
                  }),
                ]
              : [],
          });
        }),
      }),
    );
  }

  if (pdfs.length > 0) {
    children.push(
      el('div', {
        className: 'detail-pdfs',
        children: [
          el('h2', { className: 'detail-pdfs-title', text: t('detail_pdfs') }),
          el('ul', {
            className: 'detail-pdf-list',
            children: pdfs.map((pdf) =>
              el('li', {
                children: [
                  el('a', {
                    className: 'detail-pdf-link',
                    attrs: {
                      href: safeImageSrc(pdf.src) || pdf.src,
                      target: '_blank',
                      rel: 'noopener',
                    },
                    text: t('detail_open_pdf'),
                  }),
                ],
              }),
            ),
          }),
        ],
      }),
    );
  }

  return el('div', { className: 'detail-media', children });
}

/**
 * @param {'news'|'event'|'publication'} type
 * @param {string} slugOrId
 * @param {{ backPage?: string }} [opts]
 */
export function renderDetailPage(type, slugOrId, opts = {}) {
  const host = document.getElementById('detail-root');
  if (!host) return;

  let item = null;
  let backPage = opts.backPage || 'home';
  let metaLine = '';
  let title = '';
  let summary = '';
  let body = '';
  let media = [];

  if (type === 'news') {
    item = findNewsByKey(slugOrId);
    backPage = 'home';
    if (item) {
      title = item.title || '';
      metaLine = item.label || '';
      summary = item.summary || '';
      body = item.body || '';
      media = item.media || (item.img ? [{ kind: 'image', src: item.img }] : []);
    }
  } else if (type === 'event') {
    item = findEventByKey(slugOrId);
    backPage = 'events';
    if (item) {
      title = item.title || '';
      metaLine = [item.type, [item.day, item.month, item.year].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · ');
      summary = item.summary || '';
      body = item.body || '';
      media = item.media || (item.img ? [{ kind: 'image', src: item.img }] : []);
    }
  } else if (type === 'publication') {
    const found = findPublicationByKey(slugOrId);
    item = found?.pub || null;
    const cover = found ? getCoverForPub(found.index) : '';
    backPage = 'publications';
    if (item) {
      title = item.t || '';
      metaLine = [item.dept, item.type].filter(Boolean).join(' · ');
      summary = item.summary || item.desc || '';
      body = item.body || '';
      media =
        item.media && item.media.length
          ? item.media
          : cover
            ? [{ kind: 'image', src: cover }]
            : [];
    }
  }

  if (!item) {
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', { text: t('detail_not_found') }),
          el('a', {
            className: 'detail-back',
            attrs: { href: `#${backPage}`, 'data-page': backPage },
            text: t('detail_back'),
          }),
        ],
      }),
    ]);
    return;
  }

  const langAttrs = getLang() === 'en' ? { lang: 'ar' } : {};
  const mediaEl = buildMediaStage(media, title);
  const children = [
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
  ];
  if (mediaEl) children.push(mediaEl);
  children.push(
    el('header', {
      className: 'detail-header',
      attrs: langAttrs,
      children: [
        metaLine
          ? el('p', { className: 'detail-meta', text: metaLine })
          : null,
        el('h1', { className: 'detail-title section-title', text: title }),
      ].filter(Boolean),
    }),
  );
  if (summary) {
    children.push(
      el('p', {
        className: 'detail-summary',
        attrs: langAttrs,
        text: summary,
      }),
    );
  }
  if (body) {
    children.push(
      el('div', {
        className: 'detail-body',
        attrs: langAttrs,
        children: paragraphsFromPlainText(body),
      }),
    );
  } else if (!summary) {
    children.push(
      el('p', {
        className: 'detail-empty-body',
        text: t('detail_no_body'),
      }),
    );
  }

  replaceChildren(host, [
    el('article', { className: 'detail-article', children }),
  ]);
}
