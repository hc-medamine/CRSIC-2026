/**
 * Content detail page renderer (news / event / publication).
 * Body may be plain text or sanitized HTML (H1 allowlist) — never raw innerHTML.
 */
import { getLang, t } from '../i18n.js';
import { el, replaceChildren, safeImageSrc } from '../utils.js';
import { nodesFromSafeBody } from '../safeBody.js';
import {
  findNewsByKey,
  findEventByKey,
  findPublicationByKey,
  findResearchProjectByKey,
  findResearchGroupByKey,
  findPartnerByKey,
  findPlatformByKey,
  findLawByKey,
  getCoverForPub,
  getResearchProjectsForGroup,
} from '../data.js';
import { applyItemSeoHead, restoreSiteSeoHead } from '../seoHead.js';
import { createContentByline } from './contentByline.js';
import { editorialField, editorialLangAttrs } from '../editorial.js';

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
            children: pdfs.map((pdf) => {
              const href = safeImageSrc(pdf.src) || pdf.src;
              return el('li', {
                className: 'detail-pdf-item',
                children: [
                  el('iframe', {
                    className: 'detail-pdf-frame',
                    attrs: {
                      src: href,
                      title: pdf.alt || t('detail_pdfs'),
                      loading: 'lazy',
                    },
                  }),
                  el('a', {
                    className: 'detail-pdf-link',
                    attrs: {
                      href,
                      target: '_blank',
                      rel: 'noopener',
                    },
                    text: t('detail_open_pdf'),
                  }),
                ],
              });
            }),
          }),
        ],
      }),
    );
  }

  return el('div', { className: 'detail-media', children });
}

/**
 * @param {'news'|'event'|'publication'|'research-project'|'research-group'|'partner'|'alert'} type
 * @param {string} slugOrId
 * @param {{ backPage?: string, previewItem?: object, isPreview?: boolean }} [opts]
 */
export function renderDetailPage(type, slugOrId, opts = {}) {
  const host = document.getElementById('detail-root');
  if (!host) return;

  if (type === 'alert') {
    renderAlertPreview(host, opts);
    return;
  }
  if (type === 'research-project') {
    renderResearchProjectDetail(host, slugOrId, opts);
    return;
  }
  if (type === 'research-group') {
    renderResearchGroupDetail(host, slugOrId, opts);
    return;
  }
  if (type === 'partner') {
    renderPartnerDetail(host, slugOrId, opts);
    return;
  }
  if (type === 'platform') {
    renderPlatformDetail(host, slugOrId, opts);
    return;
  }
  if (type === 'law') {
    renderLawDetail(host, slugOrId, opts);
    return;
  }

  let item = opts.previewItem || null;
  let backPage = opts.backPage || 'home';
  let metaLine = '';
  let title = '';
  let summary = '';
  let body = '';
  let media = [];

  if (item && opts.isPreview) {
    if (type === 'news') {
      backPage = 'news';
      title = editorialField(item, 'title');
      metaLine = editorialField(item, 'label');
      summary = editorialField(item, 'summary');
      body = editorialField(item, 'body');
      media = item.media || (item.img ? [{ kind: 'image', src: item.img }] : []);
    } else if (type === 'event') {
      backPage = 'events';
      title = editorialField(item, 'title');
      metaLine = [editorialField(item, 'label'), [item.day, item.month, item.year].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · ');
      summary = editorialField(item, 'summary');
      body = editorialField(item, 'body');
      media = item.media || (item.img ? [{ kind: 'image', src: item.img }] : []);
    } else if (type === 'publication') {
      backPage = 'publications';
      title = editorialField(item, 'title');
      metaLine = [editorialField(item, 'label'), item.type].filter(Boolean).join(' · ');
      summary = editorialField(item, 'summary');
      body = editorialField(item, 'body');
      const cover = item.cover || item.img || '';
      media =
        item.media && item.media.length
          ? item.media
          : cover
            ? [{ kind: 'image', src: cover }]
            : [];
    }
  } else if (type === 'news') {
    item = findNewsByKey(slugOrId);
    backPage = 'news';
    if (item) {
      title = editorialField(item, 'title');
      metaLine = editorialField(item, 'label');
      summary = editorialField(item, 'summary');
      body = editorialField(item, 'body');
      media = item.media || (item.img ? [{ kind: 'image', src: item.img }] : []);
    }
  } else if (type === 'event') {
    item = findEventByKey(slugOrId);
    backPage = 'events';
    if (item) {
      title = editorialField(item, 'title');
      metaLine = [editorialField(item, 'label'), [item.day, item.month, item.year].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · ');
      summary = editorialField(item, 'summary');
      body = editorialField(item, 'body');
      media = item.media || (item.img ? [{ kind: 'image', src: item.img }] : []);
    }
  } else if (type === 'publication') {
    const found = findPublicationByKey(slugOrId);
    item = found?.pub || null;
    const cover = found ? getCoverForPub(found.index) : '';
    backPage = 'publications';
    if (item) {
      title = editorialField(item, 'title');
      metaLine = [editorialField(item, 'label'), item.type].filter(Boolean).join(' · ');
      summary = editorialField(item, 'summary');
      body = editorialField(item, 'body');
      media =
        item.media && item.media.length
          ? item.media
          : cover
            ? [{ kind: 'image', src: cover }]
            : [];
    }
  }

  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, type);

  const langAttrs = editorialLangAttrs(item);
  const mediaEl = buildMediaStage(media, title);
  const children = [
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
  ];
  if (opts.isPreview) {
    children.unshift(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
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
        type === 'news' || type === 'event'
          ? createContentByline(item, { includeDate: type === 'news' })
          : null,
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
        children: nodesFromSafeBody(body),
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

/**
 * @param {HTMLElement} host
 * @param {{ previewItem?: object, isPreview?: boolean }} [opts]
 */
function renderAlertPreview(host, opts = {}) {
  const item = opts.previewItem;
  const backPage = 'home';
  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, 'alert');
  const lang = getLang();
  const message =
    lang === 'en' && item.message_en ? item.message_en : item.message_ar || item.message_en || '';
  const linkLabel =
    lang === 'en' && item.link_label_en
      ? item.link_label_en
      : item.link_label_ar || item.link_label_en || '';

  const children = [];
  if (opts.isPreview) {
    children.push(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
  children.push(
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
    el('header', {
      className: 'detail-header',
      children: [
        el('p', { className: 'detail-meta', text: t('detail_alert_preview') || 'Alert banner preview' }),
        el('h1', { className: 'detail-title section-title', text: message || '—' }),
      ],
    }),
  );
  if (item.link && linkLabel) {
    children.push(
      el('p', {
        className: 'detail-summary',
        children: [
          el('a', {
            attrs: { href: item.link, target: '_blank', rel: 'noopener noreferrer' },
            text: linkLabel,
          }),
        ],
      }),
    );
  }
  replaceChildren(host, [el('article', { className: 'detail-article', children })]);
}

/**
 * @param {HTMLElement} host
 * @param {string} slugOrId
 * @param {{ previewItem?: object, isPreview?: boolean }} [opts]
 */
function renderPartnerDetail(host, slugOrId, opts = {}) {
  const item = opts.previewItem || findPartnerByKey(slugOrId);
  const backPage = 'cooperation';
  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, 'partner');
  const title = editorialField(item, 'name');
  const metaLine = [item.country, item.date].filter(Boolean).join(' · ');
  const summary = editorialField(item, 'summary');
  const bodyHtml = editorialField(item, 'body');
  const imgSrc = safeImageSrc(item.img || item.og_image || '');
  const children = [];
  if (opts.isPreview) {
    children.push(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
  children.push(
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
  );
  if (imgSrc) {
    children.push(
      el('div', {
        className: 'detail-hero',
        children: [
          el('img', {
            className: 'detail-hero-img',
            attrs: { src: imgSrc, alt: title, loading: 'lazy' },
          }),
        ],
      }),
    );
  } else if (item.emoji) {
    children.push(el('p', { className: 'detail-meta', text: item.emoji }));
  }
  children.push(
    el('header', {
      className: 'detail-header',
      children: [
        metaLine ? el('p', { className: 'detail-meta', text: metaLine }) : null,
        el('h1', { className: 'detail-title section-title', text: title }),
      ].filter(Boolean),
    }),
  );
  if (summary) {
    children.push(el('p', { className: 'detail-summary', text: summary }));
  }
  if (bodyHtml) {
    children.push(
      el('details', {
        className: 'detail-body-disclosure',
        children: [
          el('summary', {
            className: 'detail-read-more',
            text: t('detail_read_more'),
          }),
          el('div', {
            className: 'detail-body',
            children: nodesFromSafeBody(bodyHtml),
          }),
        ],
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
  replaceChildren(host, [el('article', { className: 'detail-article', children })]);
}

/**
 * @param {HTMLElement} host
 * @param {string} slugOrId
 * @param {{ previewItem?: object, isPreview?: boolean }} [opts]
 */
function renderPlatformDetail(host, slugOrId, opts = {}) {
  const item = opts.previewItem || findPlatformByKey(slugOrId);
  const backPage = 'platforms';
  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, 'platform');
  const lang = getLang();
  const title = lang === 'en' && item.titleEn ? item.titleEn : (item.title || '');
  const summary = lang === 'en' && item.summaryEn ? item.summaryEn : (item.summary || '');
  const bodyHtml = lang === 'en' && item.bodyEn ? item.bodyEn : (item.body || '');
  const kindKey = item.kind === 'radio'
    ? 'platform_kind_radio'
    : item.kind === 'mobility'
      ? 'platform_kind_mobility'
      : 'platform_kind_visual';
  const media = item.media && item.media.length
    ? item.media
    : (item.img ? [{ kind: 'image', src: item.img }] : []);
  const mediaEl = buildMediaStage(media, title);
  const children = [];
  if (opts.isPreview) {
    children.push(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
  children.push(
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
  );
  if (mediaEl) children.push(mediaEl);
  children.push(
    el('header', {
      className: 'detail-header',
      children: [
        el('p', { className: 'detail-meta', text: t(kindKey) }),
        el('h1', { className: 'detail-title section-title', text: title }),
      ],
    }),
  );
  if (summary) children.push(el('p', { className: 'detail-summary', text: summary }));
  if (bodyHtml) {
    children.push(
      el('div', {
        className: 'detail-body',
        children: nodesFromSafeBody(bodyHtml),
      }),
    );
  }
  if (item.externalUrl) {
    children.push(
      el('p', {
        className: 'detail-external-link',
        children: [
          el('a', {
            attrs: {
              href: item.externalUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            text: t('detail_more_info'),
          }),
        ],
      }),
    );
  }
  replaceChildren(host, [el('article', { className: 'detail-article', children })]);
}

/**
 * @param {HTMLElement} host
 * @param {string} slugOrId
 * @param {{ previewItem?: object, isPreview?: boolean }} [opts]
 */
function renderLawDetail(host, slugOrId, opts = {}) {
  const item = opts.previewItem || findLawByKey(slugOrId);
  const backPage = 'laws';
  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, 'law');
  const lang = getLang();
  const title = lang === 'en' && item.titleEn ? item.titleEn : (item.title || '');
  const summary = lang === 'en' && item.summaryEn ? item.summaryEn : (item.summary || '');
  const bodyHtml = lang === 'en' && item.bodyEn ? item.bodyEn : (item.body || '');
  const media = item.media && item.media.length
    ? item.media
    : (item.img ? [{ kind: 'image', src: item.img }] : []);
  const mediaEl = buildMediaStage(media, title);
  const children = [];
  if (opts.isPreview) {
    children.push(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
  children.push(
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
  );
  if (mediaEl) children.push(mediaEl);
  children.push(
    el('header', {
      className: 'detail-header',
      children: [
        el('p', { className: 'detail-meta', text: t('bc_laws') }),
        el('h1', { className: 'detail-title section-title', text: title }),
      ],
    }),
  );
  if (summary) children.push(el('p', { className: 'detail-summary', text: summary }));
  if (bodyHtml) {
    children.push(
      el('div', {
        className: 'detail-body',
        children: nodesFromSafeBody(bodyHtml),
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
  if (item.externalUrl) {
    children.push(
      el('p', {
        className: 'detail-external-link',
        children: [
          el('a', {
            attrs: {
              href: item.externalUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            text: t('detail_more_info'),
          }),
        ],
      }),
    );
  }
  replaceChildren(host, [el('article', { className: 'detail-article', children })]);
}


function renderResearchGroupDetail(host, slugOrId, opts = {}) {
  const lang = getLang();
  const item = opts.previewItem || findResearchGroupByKey(slugOrId);
  const backPage = 'research';
  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, 'research-group');
  const title =
    lang === 'en' && item.name_en ? item.name_en : item.name_ar || item.name_en || '';
  const summary =
    lang === 'en' && item.summary_en
      ? item.summary_en
      : item.summary_ar || item.summary_en || '';
  const lead =
    lang === 'en' && item.lead_en ? item.lead_en : item.lead_ar || item.lead_en || '';
  const members = Array.isArray(item.members) ? item.members : [];
  const imgSrc = safeImageSrc(item.img || item.og_image || '');
  const projects = item.id && !opts.isPreview ? getResearchProjectsForGroup(item.id) : [];

  const children = [];
  if (opts.isPreview) {
    children.push(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
  children.push(
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
  );
  if (imgSrc) {
    children.push(
      el('div', {
        className: 'detail-hero',
        children: [
          el('img', {
            className: 'detail-hero-img',
            attrs: { src: imgSrc, alt: title, loading: 'lazy' },
          }),
        ],
      }),
    );
  }
  children.push(
    el('header', {
      className: 'detail-header',
      children: [
        lead
          ? el('p', {
              className: 'detail-meta',
              text: `${t('research_group_lead') || 'Lead'}: ${lead}`,
            })
          : null,
        el('h1', { className: 'detail-title section-title', text: title }),
      ].filter(Boolean),
    }),
  );
  if (summary) {
    children.push(el('p', { className: 'detail-summary', text: summary }));
  }
  if (members.length > 0) {
    children.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_group_members') || 'Members',
          }),
          el('ul', {
            className: 'detail-pdf-list',
            children: members.map((m) => {
              const name =
                lang === 'en' && m.name_en ? m.name_en : m.name_ar || m.name_en || '';
              return el('li', { text: name });
            }),
          }),
        ],
      }),
    );
  }
  if (projects.length > 0) {
    children.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_group_projects') || 'Projects',
          }),
          el('ul', {
            className: 'detail-pdf-list',
            children: projects.map((p) => {
              const slug = p.slug || p.id;
              const pTitle =
                lang === 'en' && p.title_en ? p.title_en : p.title_ar || p.title_en || '';
              return el('li', {
                children: [
                  el('a', {
                    attrs: { href: `#research-project/${encodeURIComponent(slug)}` },
                    text: pTitle,
                  }),
                ],
              });
            }),
          }),
        ],
      }),
    );
  }
  replaceChildren(host, [el('article', { className: 'detail-article', children })]);
}

/**
 * @param {HTMLElement} host
 * @param {string} slugOrId
 * @param {{ previewItem?: object, isPreview?: boolean }} [opts]
 */
function renderResearchProjectDetail(host, slugOrId, opts = {}) {
  const lang = getLang();
  const item = opts.previewItem || findResearchProjectByKey(slugOrId);
  const backPage = 'research';

  if (!item) {
    restoreSiteSeoHead();
    replaceChildren(host, [
      el('div', {
        className: 'detail-not-found',
        children: [
          el('p', {
            text: opts.isPreview ? t('detail_preview_missing') : t('detail_not_found'),
          }),
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

  applyItemSeoHead(item, 'research-project');
  const langAttrs = lang === 'en' ? { lang: 'ar' } : {};
  const title =
    lang === 'en' && item.title_en ? item.title_en : item.title_ar || item.title_en || '';
  const lead =
    lang === 'en' && item.lead_en ? item.lead_en : item.lead_ar || item.lead_en || '';
  const dibaja =
    lang === 'en' && item.dibaja_en ? item.dibaja_en : item.dibaja_ar || item.dibaja_en || '';
  const questions =
    lang === 'en' && item.questions_en
      ? item.questions_en
      : item.questions_ar || item.questions_en || '';
  const duration =
    lang === 'en' && item.duration_en
      ? item.duration_en
      : item.duration_ar || item.duration_en || '';
  const group = item.groupId ? findResearchGroupByKey(item.groupId) : null;
  const groupLabel = group
    ? lang === 'en' && group.name_en
      ? group.name_en
      : group.name_ar || group.name_en || ''
    : '';

  const axes = Array.isArray(item.axes) ? item.axes : [];
  const impacts = Array.isArray(item.impacts) ? item.impacts : [];

  /** @param {object} row */
  function bilingualLine(row) {
    if (!row || typeof row !== 'object') return '';
    if (lang === 'en' && row.en) return row.en;
    return row.ar || row.en || '';
  }

  const sections = [];
  if (groupLabel) {
    sections.push(
      el('p', {
        className: 'detail-meta',
        text: `${t('research_project_group') || 'Research group'}: ${groupLabel}`,
      }),
    );
  }
  if (lead) {
    sections.push(
      el('p', {
        className: 'detail-meta',
        text: `${t('research_project_lead') || 'Project lead'}: ${lead}`,
      }),
    );
  }
  if (dibaja) {
    sections.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_project_dibaja') || 'Project preamble',
          }),
          el('div', {
            className: 'detail-body',
            attrs: langAttrs,
            children: nodesFromSafeBody(dibaja),
          }),
        ],
      }),
    );
  }
  if (questions) {
    sections.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_project_questions') || 'Research questions',
          }),
          el('div', {
            className: 'detail-body',
            attrs: langAttrs,
            children: nodesFromSafeBody(questions),
          }),
        ],
      }),
    );
  }
  if (axes.length > 0) {
    sections.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_project_axes') || 'Project axes',
          }),
          el('ul', {
            className: 'detail-list',
            children: axes
              .map((a) => bilingualLine(a))
              .filter(Boolean)
              .map((text) => el('li', { text })),
          }),
        ],
      }),
    );
  }
  if (duration) {
    sections.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_project_duration') || 'Duration',
          }),
          el('p', { className: 'detail-summary', attrs: langAttrs, text: duration }),
        ],
      }),
    );
  }
  if (impacts.length > 0) {
    sections.push(
      el('section', {
        className: 'detail-section',
        children: [
          el('h2', {
            className: 'detail-section-title',
            text: t('research_project_impacts') || 'Expected impacts',
          }),
          el('ul', {
            className: 'detail-list',
            children: impacts
              .map((a) => bilingualLine(a))
              .filter(Boolean)
              .map((text) => el('li', { text })),
          }),
        ],
      }),
    );
  }

  const articleChildren = [];
  if (opts.isPreview) {
    articleChildren.push(
      el('div', {
        className: 'detail-preview-banner',
        attrs: { role: 'status' },
        text: t('detail_preview_banner'),
      }),
    );
  }
  articleChildren.push(
    el('a', {
      className: 'detail-back',
      attrs: { href: `#${backPage}`, 'data-page': backPage },
      text: t('detail_back'),
    }),
    el('header', {
      className: 'detail-header',
      attrs: langAttrs,
      children: [el('h1', { className: 'detail-title section-title', text: title })],
    }),
    ...sections,
  );

  replaceChildren(host, [
    el('article', {
      className: 'detail-article',
      children: articleChildren,
    }),
  ]);
}

