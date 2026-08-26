import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, unlinkSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  MIN_WEBP_SOURCE_BYTES,
  attachWebpSiblings,
  ensureWebpSibling,
  isAllowedPublicImagePath,
  unlinkWebpSibling,
  webpSiblingPublicPath,
} from "./webp";

describe("webpSiblingPublicPath", () => {
  it("maps jpeg/png masters under img/cms or img/covers", () => {
    assert.equal(webpSiblingPublicPath("img/cms/news/a.jpg"), "img/cms/news/a.webp");
    assert.equal(webpSiblingPublicPath("img/covers/c00.PNG"), "img/covers/c00.webp");
    assert.equal(webpSiblingPublicPath("img/cms/news/a.webp"), null);
    assert.equal(webpSiblingPublicPath("img/Holders/0.jpg"), null);
  });
});

describe("isAllowedPublicImagePath", () => {
  it("rejects traversal and off-tree paths", () => {
    assert.equal(isAllowedPublicImagePath("img/cms/news/../secret.jpg"), false);
    assert.equal(isAllowedPublicImagePath("/etc/passwd"), false);
    assert.equal(isAllowedPublicImagePath("img/cms/news/a.jpg"), true);
  });
});

describe("ensureWebpSibling", () => {
  it("skips missing, tiny, and already-webp sources; writes a sibling for a real JPEG", async () => {
    const root = mkdtempSync(join(tmpdir(), "crs-webp-"));
    const dir = join(root, "img", "cms", "news");
    mkdirSync(dir, { recursive: true });

    assert.equal(await ensureWebpSibling("img/cms/news/missing.jpg", { root }), null);

    writeFileSync(join(dir, "stub.jpg"), Buffer.alloc(MIN_WEBP_SOURCE_BYTES - 1, 1));
    assert.equal(await ensureWebpSibling("img/cms/news/stub.jpg", { root }), null);
    assert.equal(existsSync(join(dir, "stub.webp")), false);

    writeFileSync(join(dir, "already.webp"), Buffer.alloc(2048, 2));
    assert.equal(await ensureWebpSibling("img/cms/news/already.webp", { root }), "img/cms/news/already.webp");

    await sharp({
      create: { width: 240, height: 240, channels: 3, background: { r: 20, g: 80, b: 40 } },
    })
      .jpeg({ quality: 90 })
      .toFile(join(dir, "cover.jpg"));

    const jpegSize = statSync(join(dir, "cover.jpg")).size;
    assert.ok(jpegSize >= MIN_WEBP_SOURCE_BYTES, `fixture jpeg too small: ${jpegSize}`);
    const out = await ensureWebpSibling("img/cms/news/cover.jpg", { root });
    assert.equal(out, "img/cms/news/cover.jpg".replace(/\.jpg$/, ".webp"));
    assert.equal(existsSync(join(dir, "cover.webp")), true);
    assert.equal(existsSync(join(dir, "cover.jpg")), true);

    unlinkWebpSibling("img/cms/news/cover.jpg", root);
    assert.equal(existsSync(join(dir, "cover.webp")), false);
    unlinkSync(join(dir, "cover.jpg"));
  });

  it("attachWebpSiblings omits keys when files are missing", async () => {
    const out = await attachWebpSiblings({
      img: "img/cms/news/nope.jpg",
      img_card: "img/cms/news/nope-card.jpg",
    });
    assert.equal(out.img, "img/cms/news/nope.jpg");
    assert.equal(out.img_webp, undefined);
    assert.equal(out.img_card_webp, undefined);
  });
});
