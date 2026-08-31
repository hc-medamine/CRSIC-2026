import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { webpPathIfExists, webpPublicPath } from "./webp";

describe("webpPublicPath", () => {
  it("maps jpeg/png to webp and skips webp sources", () => {
    assert.equal(webpPublicPath("img/cms/news/a.jpg"), "img/cms/news/a.webp");
    assert.equal(webpPublicPath("img/cms/news/a.png"), "img/cms/news/a.webp");
    assert.equal(webpPublicPath("img/cms/news/a.webp"), null);
    assert.equal(webpPublicPath("img/doc.pdf"), null);
  });
});

describe("webpPathIfExists", () => {
  it("returns undefined when sibling is missing", () => {
    assert.equal(webpPathIfExists("img/cms/news/does-not-exist.jpg"), undefined);
  });
});
