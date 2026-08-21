import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEATURED_NEWS_FALLBACK,
  FEATURED_NEWS_MAX,
  newsResume,
  normalizeFeaturedIds,
  resolveFeaturedNews,
} from '../js/featuredNews.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const catalog = [
  { id: 'a', slug: 'a', title: 'Newest', date: '2026-08-21' },
  { id: 'b', slug: 'b', title: 'Mid', date: '2026-08-20' },
  { id: 'c', slug: 'c', title: 'Older', date: '2026-08-19' },
  { id: 'd', slug: 'd', title: 'Oldest', date: '2026-08-18' },
];

describe('normalizeFeaturedIds', () => {
  it('dedupes, trims, and caps at 10', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `id-${i}`);
    ids.splice(2, 0, 'id-1');
    const out = normalizeFeaturedIds(['  x  ', '', 'x', ...ids]);
    assert.equal(out[0], 'x');
    assert.equal(out.length, FEATURED_NEWS_MAX);
  });
});

describe('resolveFeaturedNews', () => {
  it('falls back to newest when playlist is empty', () => {
    const items = resolveFeaturedNews(catalog, []);
    assert.equal(FEATURED_NEWS_FALLBACK, 3);
    assert.deepEqual(items.map((n) => n.id), ['a', 'b', 'c']);
  });

  it('keeps editor order and skips missing / unpublished ids', () => {
    const items = resolveFeaturedNews(catalog, ['d', 'gone', 'b', 'a']);
    assert.deepEqual(items.map((n) => n.id), ['d', 'b', 'a']);
  });

  it('falls back only when zero ids remain', () => {
    const items = resolveFeaturedNews(catalog, ['gone', 'also-gone']);
    assert.deepEqual(items.map((n) => n.id), ['a', 'b', 'c']);
  });

  it('matches by slug as well as id', () => {
    const items = resolveFeaturedNews(catalog, ['c']);
    assert.equal(items[0].id, 'c');
  });
});

describe('newsResume', () => {
  it('prefers summary then stripped body', () => {
    assert.equal(newsResume({ summary: '  Hello  ' }), 'Hello');
    assert.equal(newsResume({ body: '<p>Body copy</p>' }), 'Body copy');
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
