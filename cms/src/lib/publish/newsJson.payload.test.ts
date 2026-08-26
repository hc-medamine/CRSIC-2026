import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNewsPayload } from "./newsJson";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  title_ar: "عنوان عربي",
  label_ar: "خبر",
  summary_ar: "ملخص",
  body_ar: "<p>متن</p>",
  image_path: "img/cms/news/master.png",
  image_alt_ar: null,
  public_slug: "test-news",
};

describe("buildNewsPayload EN + card", () => {
  it("emits en_status, EN fields, and img_card without dropping Arabic", () => {
    const item = buildNewsPayload({
      ...base,
      en_status: "ready",
      title_en: "English title",
      summary_en: "English summary",
      body_en: "<p>English body</p>",
      label_en: "News",
      image_card_path: "img/cms/news/card.jpg",
    });
    assert.equal(item.title, "عنوان عربي");
    assert.equal(item.img, "img/cms/news/master.png");
    assert.equal(item.en_status, "ready");
    assert.equal(item.title_en, "English title");
    assert.equal(item.summary_en, "English summary");
    assert.equal(item.body_en, "<p>English body</p>");
    assert.equal(item.label_en, "News");
    assert.equal(item.img_card, "img/cms/news/card.jpg");
    assert.equal(item.img_webp, undefined);
    assert.equal(item.img_card_webp, undefined);
  });

  it("omits empty EN strings and treats missing status as pending", () => {
    const item = buildNewsPayload(base);
    assert.equal(item.en_status, "pending");
    assert.equal(item.title_en, undefined);
    assert.equal(item.img_card, undefined);
  });
});
