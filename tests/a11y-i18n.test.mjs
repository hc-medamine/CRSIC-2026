/**
 * Node built-in tests for focus-trap helpers and lang URL parsing.
 * Run: node --test tests/*.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOCUSABLE_SELECTOR, handleEscapeStack } from '../js/a11y.js';
import { parseLangParam } from '../js/i18n.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARROW_CTA_KEYS = [
  'nav_about_all',
  'nav_pubs_all',
  'nav_events_all',
  'home_view_all',
  'home_view_all_pubs',
  'home_view_all_events',
  'journal_access_btn',
  'coop_cta_btn',
  'footer_journal_btn',
  'detail_back',
];

describe('a11y helpers', () => {
  it('exports a non-empty focusable selector', () => {
    assert.ok(FOCUSABLE_SELECTOR.includes('button'));
    assert.ok(FOCUSABLE_SELECTOR.includes('a[href]'));
  });

  it('Escape closes topmost open dialog only', () => {
    const calls = [];
    const e = { key: 'Escape', preventDefault() { calls.push('prevent'); } };
    handleEscapeStack(e, [
      { isOpen: () => true, close: () => calls.push('lb') },
      { isOpen: () => true, close: () => calls.push('drawer') },
    ]);
    assert.deepEqual(calls, ['prevent', 'lb']);
  });

  it('Escape ignores when nothing open', () => {
    let closed = false;
    handleEscapeStack({ key: 'Escape', preventDefault() {} }, [
      { isOpen: () => false, close: () => { closed = true; } },
    ]);
    assert.equal(closed, false);
  });
});

describe('i18n URL lang param', () => {
  it('parses ar and en', () => {
    assert.equal(parseLangParam('?lang=en'), 'en');
    assert.equal(parseLangParam('lang=ar'), 'ar');
  });

  it('rejects unknown values', () => {
    assert.equal(parseLangParam('?lang=fr'), null);
    assert.equal(parseLangParam(''), null);
  });
});

describe('i18n directional CTA strings', () => {
  for (const lang of ['ar', 'en']) {
    it(`${lang} CTA keys have no embedded ←/→ (CSS arrows)`, () => {
      const data = JSON.parse(
        readFileSync(join(root, 'data', 'locales', `${lang}.json`), 'utf8'),
      );
      for (const key of ARROW_CTA_KEYS) {
        assert.ok(key in data, `missing key ${key}`);
        assert.equal(
          /[←→]/.test(data[key]),
          false,
          `${lang}.${key} must not contain arrow glyphs: ${JSON.stringify(data[key])}`,
        );
      }
    });
  }
});
