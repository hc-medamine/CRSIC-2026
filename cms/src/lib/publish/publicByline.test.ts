import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PUBLIC_PUBLISHER_AR,
  PUBLIC_PUBLISHER_EN,
  personPublicNames,
  publicBylineFromPeople,
  resolveNewsStoryDate,
  toIsoDate,
} from "./publicByline";

describe("toIsoDate", () => {
  it("keeps YYYY-MM-DD and strips time", () => {
    assert.equal(toIsoDate("2024-10-08T09:11:00+01:00"), "2024-10-08");
    assert.equal(toIsoDate("2024-10-08"), "2024-10-08");
  });

  it("returns empty for junk", () => {
    assert.equal(toIsoDate(""), "");
    assert.equal(toIsoDate(null), "");
    assert.equal(toIsoDate("octobre 2024"), "");
  });
});

describe("resolveNewsStoryDate", () => {
  it("prefers WP date over CMS published_at", () => {
    const hit = resolveNewsStoryDate({
      publishedAt: "2026-08-21T02:22:00Z",
      wpDate: "2024-10-08T12:00:00+01:00",
    });
    assert.deepEqual(hit, { date: "2024-10-08", date_source: "wp" });
  });

  it("keeps stored WP date on republish", () => {
    const hit = resolveNewsStoryDate({
      publishedAt: "2026-08-21",
      liveDate: "2025-01-16",
      liveDateSource: "wp",
    });
    assert.deepEqual(hit, { date: "2025-01-16", date_source: "wp" });
  });

  it("uses CMS published_at when no WP date", () => {
    const hit = resolveNewsStoryDate({
      publishedAt: new Date("2026-08-21T10:00:00Z"),
    });
    assert.equal(hit.date_source, "cms");
    assert.equal(hit.date, "2026-08-21");
  });
});

describe("publicBylineFromPeople", () => {
  it("uses AR/EN names with display_name fallback and fixed publisher", () => {
    const byline = publicBylineFromPeople(
      { nameAr: "ايمان مقوسي", nameEn: "", displayName: "i.megoussi" },
      { nameAr: "", nameEn: "", displayName: "F. Boufatah" },
    );
    assert.equal(byline.editor_ar, "ايمان مقوسي");
    assert.equal(byline.editor_en, "i.megoussi");
    assert.equal(byline.reviewer_ar, "F. Boufatah");
    assert.equal(byline.publisher_ar, PUBLIC_PUBLISHER_AR);
    assert.equal(byline.publisher_en, PUBLIC_PUBLISHER_EN);
  });

  it("omits empty editor/reviewer names", () => {
    const names = personPublicNames(null);
    assert.deepEqual(names, { ar: "", en: "" });
  });
});
