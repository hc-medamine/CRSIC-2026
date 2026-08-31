import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeSitePageDict, SITE_PAGE_OVERLAY_KEYS } from '../js/sitePages.js';

describe('mergeSitePageDict', () => {
  it('overlays non-empty CMS strings and leaves locale fallbacks', () => {
    const base = {
      about_hero_h1: 'من نحن',
      about_vision_p: 'رؤية احتياطية',
      nav_home: 'الرئيسية',
    };
    const out = mergeSitePageDict(base, {
      about_hero_h1: 'عنوان منشور',
      about_vision_p: '  ',
      nav_home: 'should not apply',
      unknown_key: 'ignored',
    });
    assert.equal(out.about_hero_h1, 'عنوان منشور');
    assert.equal(out.about_vision_p, 'رؤية احتياطية');
    assert.equal(out.nav_home, 'الرئيسية');
    assert.equal(out.unknown_key, undefined);
  });

  it('returns a copy when overlay is missing', () => {
    const base = { about_hero_h1: 'من نحن' };
    const out = mergeSitePageDict(base, null);
    assert.equal(out.about_hero_h1, 'من نحن');
    assert.notEqual(out, base);
  });

  it('includes footer_contact_addr in the overlay allowlist', () => {
    assert.ok(SITE_PAGE_OVERLAY_KEYS.includes('footer_contact_addr'));
    assert.ok(SITE_PAGE_OVERLAY_KEYS.includes('contact_addr_val'));
  });
});
