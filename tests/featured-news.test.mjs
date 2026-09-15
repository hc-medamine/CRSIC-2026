import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEATURED_NEWS_FALLBACK,
  FEATURED_NEWS_MAX,
  featuredFallbackMix,
  hasFeaturedImage,
  newsResume,
  normalizeFeaturedIds,
  normalizeFeaturedItems,
  resolveFeaturedNews,
  resolveFeaturedPlaylist,
} from '../js/featuredNews.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const news = [
  { id: 'a', slug: 'a', title: 'Newest news', date: '2026-08-21', img: 'img/a.jpg' },
  { id: 'b', slug: 'b', title: 'Mid news', date: '2026-08-20', img: 'img/b.jpg' },
  { id: 'c', slug: 'c', title: 'Older news', date: '2026-08-19', img: 'img/c.jpg' },
  { id: 'd', slug: 'd', title: 'Oldest news', date: '2026-08-18', img: 'img/d.jpg' },
  { id: 'bare', slug: 'bare', title: 'No image news', date: '2026-08-22' },
];

const events = [
  { id: 'e1', slug: 'e1', title: 'New event', day: '22', month: 'أوت', year: '2026', cover: 'img/e1.jpg' },
  { id: 'e2', slug: 'e2', title: 'Old event', day: '10', month: 'ماي', year: '2025', cover: 'img/e2.jpg' },
  { id: 'e-bare', slug: 'e-bare', title: 'No image event', day: '23', month: 'أوت', year: '2026' },
];

describe('normalizeFeaturedItems', () => {
  it('reads items and migrates legacy ids to news', () => {
    assert.deepEqual(normalizeFeaturedItems({ items: [{ type: 'event', id: 'e1' }, { type: 'news', id: 'a' }] }), [
      { type: 'event', id: 'e1' },
      { type: 'news', id: 'a' },
    ]);
    assert.deepEqual(normalizeFeaturedItems({ ids: ['a', 'b'] }), [
      { type: 'news', id: 'a' },
      { type: 'news', id: 'b' },
    ]);
  });

  it('dedupes, trims, and caps at 10', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `id-${i}`);
    ids.splice(2, 0, 'id-1');
    const out = normalizeFeaturedItems({ ids: ['  x  ', '', 'x', ...ids] });
    assert.equal(out[0].id, 'x');
    assert.equal(out.length, FEATURED_NEWS_MAX);
  });
});

describe('normalizeFeaturedIds', () => {
  it('returns news ids only', () => {
    assert.deepEqual(normalizeFeaturedIds(['a', 'b']), ['a', 'b']);
  });
});

describe('hasFeaturedImage', () => {
  it('detects img_card, media, img, cover, og_image', () => {
    assert.equal(hasFeaturedImage({ img_card: 'x.jpg' }), true);
    assert.equal(hasFeaturedImage({ media: [{ kind: 'image', src: 'm.jpg' }] }), true);
    assert.equal(hasFeaturedImage({ img: 'i.jpg' }), true);
    assert.equal(hasFeaturedImage({ cover: 'c.jpg' }), true);
    assert.equal(hasFeaturedImage({ og_image: 'o.jpg' }), true);
    assert.equal(hasFeaturedImage({ title: 'none' }), false);
    assert.equal(hasFeaturedImage(undefined), false);
  });
});

describe('resolveFeaturedPlaylist', () => {
  it('keeps editor order across types and skips missing', () => {
    const items = resolveFeaturedPlaylist(news, events, {
      items: [
        { type: 'event', id: 'e2' },
        { type: 'news', id: 'gone' },
        { type: 'news', id: 'b' },
        { type: 'event', id: 'e1' },
      ],
    });
    assert.deepEqual(
      items.map((n) => `${n._featType}:${n.id}`),
      ['event:e2', 'news:b', 'event:e1'],
    );
  });

  it('falls back to mixed newest with images when playlist empty', () => {
    assert.equal(FEATURED_NEWS_FALLBACK, 10);
    const items = resolveFeaturedPlaylist(news, events, { items: [] });
    assert.deepEqual(
      items.map((n) => `${n._featType}:${n.id}`),
      ['event:e1', 'news:a', 'news:b', 'news:c', 'news:d', 'event:e2'],
    );
    assert.ok(!items.some((n) => n.id === 'bare' || n.id === 'e-bare'));
  });

  it('falls back when zero ids remain', () => {
    const items = resolveFeaturedPlaylist(news, events, {
      items: [{ type: 'news', id: 'gone' }],
    });
    assert.ok(items.length >= 4);
    assert.equal(items[0]._featType, 'event');
    assert.equal(items[0].id, 'e1');
  });

  it('keeps curated imageless items (fallback only filters)', () => {
    const items = resolveFeaturedPlaylist(news, events, {
      items: [{ type: 'news', id: 'bare' }, { type: 'news', id: 'a' }],
    });
    assert.deepEqual(
      items.map((n) => n.id),
      ['bare', 'a'],
    );
  });
});

describe('featuredFallbackMix', () => {
  it('sorts by date across types and drops imageless', () => {
    const mix = featuredFallbackMix(news, events, 3);
    assert.deepEqual(
      mix.map((n) => n.id),
      ['e1', 'a', 'b'],
    );
  });
});

describe('resolveFeaturedNews', () => {
  it('legacy path still falls back to three newest news with images', () => {
    const items = resolveFeaturedNews(news, []);
    assert.deepEqual(items.map((n) => n.id), ['a', 'b', 'c']);
  });
});

describe('newsResume', () => {
  it('prefers summary then stripped body', () => {
    assert.equal(newsResume({ summary: '  Hello  ' }), 'Hello');
    assert.equal(newsResume({ body: '<p>Body copy</p>' }), 'Body copy');
  });
});

describe('eventResume', () => {
  it('returns empty when no summary or body', async () => {
    const { eventResume } = await import('../js/featuredNews.js');
    assert.equal(eventResume({ title: 'Only title' }), '');
  });

  it('truncates long body for cards', async () => {
    const { eventResume } = await import('../js/featuredNews.js');
    const long = 'أ'.repeat(250);
    const out = eventResume({ body: `<p>${long}</p>` });
    assert.ok(out.endsWith('…'));
    assert.ok(out.length <= 182);
  });
});

describe('featured news locale keys', () => {
  for (const lang of ['ar', 'en']) {
    it(`${lang} has news kicker and CTA`, () => {
      const data = JSON.parse(
        readFileSync(join(root, 'data', 'locales', `${lang}.json`), 'utf8'),
      );
      assert.ok(data.feat_carousel_kicker);
      assert.ok(data.feat_carousel_cta);
      assert.doesNotMatch(data.feat_carousel_kicker, /event/i);
      assert.doesNotMatch(data.feat_carousel_cta, /event/i);
    });
  }
});
