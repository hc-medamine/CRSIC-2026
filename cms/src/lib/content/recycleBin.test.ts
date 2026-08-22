import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RECYCLE_STALE_DAYS,
  collectMediaPaths,
  isRecycleEligibleStatus,
  isStaleRecycled,
} from "./recycleBin";

describe("isRecycleEligibleStatus", () => {
  it("allows unpublished and rejected only", () => {
    assert.equal(isRecycleEligibleStatus("unpublished"), true);
    assert.equal(isRecycleEligibleStatus("rejected"), true);
    assert.equal(isRecycleEligibleStatus("draft"), false);
    assert.equal(isRecycleEligibleStatus("published"), false);
    assert.equal(isRecycleEligibleStatus("submitted"), false);
  });
});

describe("isStaleRecycled", () => {
  it("is false inside the 90-day window", () => {
    const now = new Date("2026-08-22T00:00:00Z");
    const recent = new Date("2026-08-01T00:00:00Z");
    assert.equal(isStaleRecycled(recent, now), false);
  });

  it(`is true after ${RECYCLE_STALE_DAYS} days`, () => {
    const now = new Date("2026-08-22T00:00:00Z");
    const old = new Date("2026-04-01T00:00:00Z");
    assert.equal(isStaleRecycled(old, now), true);
  });
});

describe("collectMediaPaths", () => {
  it("collects image_path, og_image, and attachment src", () => {
    const paths = collectMediaPaths({
      image_path: "img/cms/news/a.png",
      og_image: "img/cms/news/a.png",
      attachments: [{ kind: "image", src: "img/cms/news/b.jpg" }, { kind: "pdf", src: "img/cms/news/c.pdf" }],
    });
    assert.deepEqual(paths.sort(), [
      "img/cms/news/a.png",
      "img/cms/news/b.jpg",
      "img/cms/news/c.pdf",
    ]);
  });

  it("ignores non-img paths", () => {
    const paths = collectMediaPaths({
      image_path: "https://example.com/x.png",
      attachments: [{ src: "docs/a.pdf" }],
    });
    assert.deepEqual(paths, []);
  });
});
