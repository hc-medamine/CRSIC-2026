import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withImgCard, withPublicStoryFields, withStoryEn } from "./storyPublic";

describe("withStoryEn", () => {
  it("treats missing en_status as pending and omits empty EN fields", () => {
    const out = withStoryEn({ title: "عربي" }, { title_en: "  ", summary_en: "Hello" });
    assert.equal(out.en_status, "pending");
    assert.equal(out.title_en, undefined);
    assert.equal(out.summary_en, "Hello");
  });

  it("emits ready and name_en when asked", () => {
    const out = withStoryEn(
      { name: "مركز" },
      { en_status: "ready", title_en: "CRSIC" },
      { nameEn: true },
    );
    assert.equal(out.en_status, "ready");
    assert.equal(out.title_en, "CRSIC");
    assert.equal(out.name_en, "CRSIC");
  });
});

describe("withImgCard", () => {
  it("adds img_card only when a path is present", () => {
    assert.deepEqual(withImgCard({ img: "img/a.png" }, "  "), { img: "img/a.png" });
    assert.equal(withImgCard({ img: "img/a.png" }, "img/a-card.jpg").img_card, "img/a-card.jpg");
  });
});

describe("withPublicStoryFields", () => {
  it("does not invent EN text", () => {
    const out = withPublicStoryFields(
      { title: "خبر" },
      { en_status: "ready", image_card_path: "img/cms/news/x-card.jpg" },
    );
    assert.equal(out.en_status, "ready");
    assert.equal(out.title_en, undefined);
    assert.equal(out.img_card, "img/cms/news/x-card.jpg");
  });
});
