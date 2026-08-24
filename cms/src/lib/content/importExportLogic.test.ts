import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectZipMediaPaths,
  importAlwaysDraft,
  parseManifest,
  resolveImportAuthor,
  shouldExportRow,
  zipFileNameForPath,
  CMS_ZIP_FORMAT,
  CMS_ZIP_VERSION,
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
});
