import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  editorialCardAttrs,
  editorialField,
  isEditorialEnReady,
} from '../js/editorial.js';
import { cmsCardImageSrc, cmsCardWebpSrc, cmsItemImageSrc, cmsItemWebpSrc } from '../js/data.js';
import { resolvePictureSrcs } from '../js/utils.js';

const ready = {
  en_status: 'ready',
  title: 'عنوان',
  title_en: 'Title',
  summary: 'ملخص',
  summary_en: '',
  body: 'متن عربي',
  body_en: 'English body',
  img: 'img/cms/news/master.png',
  img_card: 'img/cms/news/card.jpg',
  img_webp: 'img/cms/news/master.webp',
  img_card_webp: 'img/cms/news/card.webp',
};

const pending = {
  title: 'عنوان',
  title_en: 'Title',
  summary: 'ملخص',
  body: 'متن',
  img: 'img/cms/news/master.png',
  img_card: 'img/cms/news/card.jpg',
};

describe('isEditorialEnReady', () => {
  it('requires en_status ready; missing JSON is not ready', () => {
    assert.equal(isEditorialEnReady(ready), true);
    assert.equal(isEditorialEnReady(pending), false);
    assert.equal(isEditorialEnReady({ en_status: 'pending' }), false);
    assert.equal(isEditorialEnReady(null), false);
  });
});

describe('editorialField', () => {
  it('uses EN when ready, Arabic fallback for an empty EN field', () => {
    assert.equal(editorialField(ready, 'title', 'en'), 'Title');
    assert.equal(editorialField(ready, 'summary', 'en'), 'ملخص');
    assert.equal(editorialField(ready, 'body', 'en'), 'English body');
  });

  it('keeps full Arabic when not ready even if EN fields exist', () => {
    assert.equal(editorialField(pending, 'title', 'en'), 'عنوان');
    assert.equal(editorialField(ready, 'title', 'ar'), 'عنوان');
  });
});

describe('editorialCardAttrs', () => {
  it('marks ready vs not ready for section notices', () => {
    assert.equal(editorialCardAttrs(ready, 'en')['data-en-ready'], '1');
    assert.equal(editorialCardAttrs(pending, 'en')['data-en-ready'], '0');
    assert.equal(editorialCardAttrs(pending, 'en').lang, 'ar');
    assert.equal(editorialCardAttrs(ready, 'en').lang, 'en');
  });
});

describe('cmsCardImageSrc', () => {
  it('prefers img_card on cards and leaves master for detail', () => {
    assert.equal(cmsCardImageSrc(ready), 'img/cms/news/card.jpg');
    assert.equal(cmsItemImageSrc(ready), 'img/cms/news/master.png');
    assert.equal(cmsCardImageSrc({ img: 'img/cms/news/master.png' }), 'img/cms/news/master.png');
  });

  it('pairs card WebP with the card file and master WebP with detail', () => {
    assert.equal(cmsCardWebpSrc(ready), 'img/cms/news/card.webp');
    assert.equal(cmsItemWebpSrc(ready), 'img/cms/news/master.webp');
    assert.equal(cmsCardWebpSrc({ img: 'img/cms/news/master.png', img_webp: 'img/cms/news/master.webp' }), 'img/cms/news/master.webp');
    assert.equal(cmsCardWebpSrc({ img: 'img/a.jpg', img_card: 'img/a-card.jpg' }), '');
  });
});

describe('resolvePictureSrcs', () => {
  it('omits WebP when the key is missing or unsafe', () => {
    assert.deepEqual(resolvePictureSrcs('img/cms/news/a.jpg', ''), { jpeg: 'img/cms/news/a.jpg', webp: '' });
    assert.deepEqual(resolvePictureSrcs('img/cms/news/a.jpg', 'javascript:alert(1)'), {
      jpeg: 'img/cms/news/a.jpg',
      webp: '',
    });
    assert.deepEqual(resolvePictureSrcs('img/cms/news/a.jpg', 'img/cms/news/a.webp'), {
      jpeg: 'img/cms/news/a.jpg',
      webp: 'img/cms/news/a.webp',
    });
    assert.deepEqual(resolvePictureSrcs('', 'img/cms/news/a.webp'), { jpeg: '', webp: '' });
  });
});
