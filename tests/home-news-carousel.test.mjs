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
    assert.equal(homeNewsPageCount(3), 1);
    assert.equal(homeNewsPageCount(1), 1);
  });
  it('ceil-divides by 3', () => {
    assert.equal(HOME_NEWS_PAGE_SIZE, 3);
    assert.equal(homeNewsPageCount(4), 2);
    assert.equal(homeNewsPageCount(39), 13);
    assert.equal(homeNewsPageCount(36), 12);
  });
});

describe('wrapNewsPageIndex', () => {
  it('loops forward and back', () => {
    assert.equal(wrapNewsPageIndex(13, 13), 0);
    assert.equal(wrapNewsPageIndex(-1, 13), 12);
    assert.equal(wrapNewsPageIndex(3, 13), 3);
  });
  it('is 0 when there are no pages', () => {
    assert.equal(wrapNewsPageIndex(2, 0), 0);
  });
});

describe('homeNewsPageItems', () => {
  const items = Array.from({ length: 39 }, (_, i) => i);
  it('returns three items for a full page', () => {
    assert.deepEqual(homeNewsPageItems(items, 0), [0, 1, 2]);
    assert.deepEqual(homeNewsPageItems(items, 1), [3, 4, 5]);
  });
  it('returns a short last page with no padding', () => {
    const short = Array.from({ length: 40 }, (_, i) => i);
    assert.deepEqual(homeNewsPageItems(short, 13), [39]);
  });
  it('loops the last page to the first', () => {
    assert.deepEqual(homeNewsPageItems(items, 13), homeNewsPageItems(items, 0));
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
