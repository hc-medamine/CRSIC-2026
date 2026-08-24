import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RECYCLE_STALE_DAYS,
  canManageRecycleBin,
  canOpenRecycleBin,
  canRecycleFromEditPage,
  canRestoreRecycledRow,
  collectMediaPaths,
  isEditorRecycleEligibleStatus,
  isRecycleEligibleStatus,
  isStaleRecycled,
} from "./recycleBin";

function user(
  role: "super_admin" | "editor" | "reviewer",
  id = "u1",
): { id: string; email: string; displayName: string; role: typeof role } {
  return { id, email: `${id}@crs.dz`, displayName: id, role };
}

describe("isRecycleEligibleStatus", () => {
  it("allows unpublished and rejected only (SA set)", () => {
    assert.equal(isRecycleEligibleStatus("unpublished"), true);
    assert.equal(isRecycleEligibleStatus("rejected"), true);
    assert.equal(isRecycleEligibleStatus("draft"), false);
    assert.equal(isRecycleEligibleStatus("published"), false);
    assert.equal(isRecycleEligibleStatus("submitted"), false);
  });
});

describe("isEditorRecycleEligibleStatus", () => {
  it("allows draft and rejected only", () => {
    assert.equal(isEditorRecycleEligibleStatus("draft"), true);
    assert.equal(isEditorRecycleEligibleStatus("rejected"), true);
    assert.equal(isEditorRecycleEligibleStatus("submitted"), false);
    assert.equal(isEditorRecycleEligibleStatus("unpublished"), false);
    assert.equal(isEditorRecycleEligibleStatus("published"), false);
    assert.equal(isEditorRecycleEligibleStatus("changes_requested"), false);
  });
});

describe("recycle role gates", () => {
  it("edit-page Recycle: Editor own draft/rejected; SA unpublished/rejected", () => {
    const editor = user("editor", "ed");
    const sa = user("super_admin", "sa");
    const reviewer = user("reviewer", "rv");
    assert.equal(canRecycleFromEditPage(editor, { created_by: "ed", status: "draft" }), true);
    assert.equal(canRecycleFromEditPage(editor, { created_by: "ed", status: "rejected" }), true);
    assert.equal(canRecycleFromEditPage(editor, { created_by: "ed", status: "submitted" }), false);
    assert.equal(canRecycleFromEditPage(editor, { created_by: "other", status: "draft" }), false);
    assert.equal(canRecycleFromEditPage(sa, { created_by: "ed", status: "unpublished" }), true);
    assert.equal(canRecycleFromEditPage(sa, { created_by: "ed", status: "draft" }), false);
    assert.equal(canRecycleFromEditPage(reviewer, { created_by: "rv", status: "draft" }), false);
  });

  it("bin page: Editor and SA may open; Reviewer may not; purge is SA only", () => {
    assert.equal(canOpenRecycleBin(user("editor")), true);
    assert.equal(canOpenRecycleBin(user("super_admin")), true);
    assert.equal(canOpenRecycleBin(user("reviewer")), false);
    assert.equal(canManageRecycleBin(user("editor")), false);
    assert.equal(canManageRecycleBin(user("super_admin")), true);
    assert.equal(canManageRecycleBin(user("reviewer")), false);
  });

  it("restore: Editor own rows only; SA any; Reviewer none", () => {
    const editor = user("editor", "ed");
    assert.equal(canRestoreRecycledRow(editor, "ed"), true);
    assert.equal(canRestoreRecycledRow(editor, "other"), false);
    assert.equal(canRestoreRecycledRow(user("super_admin"), "ed"), true);
    assert.equal(canRestoreRecycledRow(user("reviewer"), "ed"), false);
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
      image_card_path: "img/cms/news/a-card.jpg",
      og_image: "img/cms/news/a.png",
      attachments: [{ kind: "image", src: "img/cms/news/b.jpg" }, { kind: "pdf", src: "img/cms/news/c.pdf" }],
    });
    assert.deepEqual(paths.sort(), [
      "img/cms/news/a-card.jpg",
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
