import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOME_NEWS_PAGE_SIZE,
  homeNewsPageCount,
  homeNewsPageItems,
  wrapNewsPageIndex,
} from '../js/homeNewsPages.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('homeNewsPageCount', () => {
  it('is 0 for empty', () => {
    assert.equal(homeNewsPageCount(0), 0);
  });
  it('is 1 for a short list', () => {
    assert.equal(homeNewsPageCount(6), 1);
    assert.equal(homeNewsPageCount(1), 1);
  });
  it('ceil-divides by 6', () => {
    assert.equal(HOME_NEWS_PAGE_SIZE, 6);
    assert.equal(homeNewsPageCount(7), 2);
    assert.equal(homeNewsPageCount(39), 7);
    assert.equal(homeNewsPageCount(36), 6);
  });
});

describe('wrapNewsPageIndex', () => {
  it('loops forward and back', () => {
    assert.equal(wrapNewsPageIndex(7, 7), 0);
    assert.equal(wrapNewsPageIndex(-1, 7), 6);
    assert.equal(wrapNewsPageIndex(3, 7), 3);
  });
  it('is 0 when there are no pages', () => {
    assert.equal(wrapNewsPageIndex(2, 0), 0);
  });
});

describe('homeNewsPageItems', () => {
  const items = Array.from({ length: 39 }, (_, i) => i);
  it('returns six items for a full page', () => {
    assert.deepEqual(homeNewsPageItems(items, 0), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(homeNewsPageItems(items, 1), [6, 7, 8, 9, 10, 11]);
  });
  it('returns a short last page with no padding', () => {
    assert.deepEqual(homeNewsPageItems(items, 6), [36, 37, 38]);
  });
  it('loops the last page to the first', () => {
    assert.deepEqual(homeNewsPageItems(items, 7), homeNewsPageItems(items, 0));
  });
});

describe('home news carousel locale keys', () => {
  for (const lang of ['ar', 'en']) {
    it(`${lang} has pause/play keys`, () => {
      const data = JSON.parse(
        readFileSync(join(root, 'data', 'locales', `${lang}.json`), 'utf8'),
      );
      assert.ok(data.home_news_pause);
      assert.ok(data.home_news_play);
    });
  }
});
