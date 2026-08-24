import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLONE_TITLE_SUFFIX_AR,
  CLONE_TITLE_SUFFIX_EN,
  cloneTitles,
  isCloneableType,
  skipReasonFromCloneError,
} from "./cloneContent";

describe("cloneTitles", () => {
  it("always suffixes Arabic and suffixes English when present", () => {
    const once = cloneTitles("خبر", "News");
    assert.equal(once.titleAr, `خبر${CLONE_TITLE_SUFFIX_AR}`);
    assert.equal(once.titleEn, `News${CLONE_TITLE_SUFFIX_EN}`);
  });

  it("leaves empty English empty", () => {
    assert.equal(cloneTitles("خبر", null).titleEn, null);
    assert.equal(cloneTitles("خبر", "  ").titleEn, null);
  });

  it("stacks suffixes on a clone of a clone", () => {
    const first = cloneTitles("خبر", "News");
    const second = cloneTitles(first.titleAr, first.titleEn);
    assert.equal(second.titleAr, `خبر${CLONE_TITLE_SUFFIX_AR}${CLONE_TITLE_SUFFIX_AR}`);
    assert.equal(second.titleEn, `News${CLONE_TITLE_SUFFIX_EN}${CLONE_TITLE_SUFFIX_EN}`);
  });
});

describe("isCloneableType", () => {
  it("accepts the nine list types only", () => {
    assert.equal(isCloneableType("news"), true);
    assert.equal(isCloneableType("research_project"), true);
    assert.equal(isCloneableType("page"), false);
    assert.equal(isCloneableType(""), false);
  });
});

describe("skipReasonFromCloneError", () => {
  it("maps clone gates", () => {
    assert.equal(skipReasonFromCloneError(new Error("Not found")).reason, "not_found");
    assert.equal(
      skipReasonFromCloneError(new Error("Item is already in the recycle bin")).reason,
      "already_binned",
    );
    assert.equal(skipReasonFromCloneError(new Error("Wrong content type")).reason, "wrong_type");
    assert.equal(
      skipReasonFromCloneError(new Error("No permission to create this content type")).reason,
      "no_create",
    );
    assert.equal(
      skipReasonFromCloneError(new Error("No permission for this organisation unit")).reason,
      "no_create",
    );
    assert.equal(skipReasonFromCloneError(new Error("Reviewer role required")).reason, "reviewer_required");
    assert.equal(skipReasonFromCloneError(new Error("disk full")).reason, "other");
  });
});
