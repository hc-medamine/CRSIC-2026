/**
 * Node built-in tests for focus-trap helpers and lang URL parsing.
 * Run: node --test tests/*.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FOCUSABLE_SELECTOR, handleEscapeStack } from '../js/a11y.js';
import { parseLangParam } from '../js/i18n.js';

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
