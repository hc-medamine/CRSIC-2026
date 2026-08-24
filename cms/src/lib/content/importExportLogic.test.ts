import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHeaderCheckbox,
  collectZipMediaPaths,
  headerCheckboxState,
  importAlwaysDraft,
  parseManifest,
  remainingExportIds,
  resolveImportAuthor,
  selectedExportError,
  shouldExportRow,
  shouldWarnLargeExport,
  uniqueExportIds,
  zipFileNameForPath,
  CMS_ZIP_FORMAT,
  CMS_ZIP_VERSION,
  EXPORT_COUNT_WARN,
  EXPORT_NONE_REMAINING,
  EXPORT_PAGE_SIZE,
} from "./importExportLogic";

describe("importExportLogic", () => {
  it("never imports as published", () => {
    assert.equal(importAlwaysDraft(), "draft");
  });

  it("skips recycled rows on export", () => {
    assert.equal(shouldExportRow(null), true);
    assert.equal(shouldExportRow(new Date()), false);
  });

  it("restores author by email or falls back to Super Admin", () => {
    const users = [
      { email: "i.megoussi@crsic.dz", id: "editor-1", isActive: true },
      { email: "gone@crsic.dz", id: "x", isActive: false },
    ];
    assert.deepEqual(
      resolveImportAuthor({
        zipEmail: "i.megoussi@crsic.dz",
        users,
        saUserId: "sa",
      }),
      { userId: "editor-1", restored: true },
    );
    assert.deepEqual(
      resolveImportAuthor({ zipEmail: "gone@crsic.dz", users, saUserId: "sa" }),
      { userId: "sa", restored: false },
    );
    assert.deepEqual(
      resolveImportAuthor({ zipEmail: null, users, saUserId: "sa" }),
      { userId: "sa", restored: false },
    );
  });

  it("collects img/ paths including card", () => {
    const paths = collectZipMediaPaths({
      image_path: "img/cms/news/a.png",
      image_card_path: "img/cms/news/a-card.png",
      og_image: "https://evil.example/x.png",
      attachments: [{ kind: "pdf", src: "img/cms/news/b.pdf" }],
    });
    assert.deepEqual(paths.sort(), [
      "img/cms/news/a-card.png",
      "img/cms/news/a.png",
      "img/cms/news/b.pdf",
    ]);
  });

  it("parses a valid manifest and rejects public JSON dumps", () => {
    const ok = parseManifest({
      format: CMS_ZIP_FORMAT,
      version: CMS_ZIP_VERSION,
      exported_at: "2026-08-24",
      content_type: "news",
      items: [],
    });
    assert.equal(ok.content_type, "news");
    assert.throws(() => parseManifest({ news: [] }), /not a CRSIC Desk export/);
  });

  it("maps public paths into the zip files/ folder", () => {
    assert.equal(zipFileNameForPath("img/cms/news/a.png"), "files/cms/news/a.png");
  });

  it("selected export never publishes", () => {
    assert.equal(importAlwaysDraft(), "draft");
  });

  it("does not drop extras above 200", () => {
    const ids = Array.from({ length: EXPORT_COUNT_WARN + 5 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    assert.equal(uniqueExportIds(ids).length, EXPORT_COUNT_WARN + 5);
    assert.equal(shouldWarnLargeExport(EXPORT_COUNT_WARN), false);
    assert.equal(shouldWarnLargeExport(EXPORT_COUNT_WARN + 1), true);
  });

  it("skips missing or recycled ids and fails if none remain", () => {
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    const gone = "33333333-3333-4333-8333-333333333333";
    assert.deepEqual(remainingExportIds([a, gone, b, a], [b, a]), [a, b]);
    assert.equal(selectedExportError(0), EXPORT_NONE_REMAINING);
    assert.equal(selectedExportError(1), null);
    assert.equal(shouldExportRow(new Date()), false);
  });

  it("header checkbox is loaded rows only", () => {
    const loaded = ["a", "b"];
    const selected = new Set(["a", "z"]);
    const checked = applyHeaderCheckbox(loaded, selected, true);
    assert.deepEqual([...checked].sort(), ["a", "b", "z"]);
    const unchecked = applyHeaderCheckbox(loaded, checked, false);
    assert.deepEqual([...unchecked], ["z"]);
    const state = headerCheckboxState(loaded, new Set(["a"]));
    assert.equal(state.checked, false);
    assert.equal(state.indeterminate, true);
    assert.equal(EXPORT_PAGE_SIZE, 20);
  });
});
