import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSubmitStatus,
  isEditableStatus,
  isReviewerDecisionStatus,
  normalizeStatusOnEdit,
  submitStatusError,
} from "./reviewWorkflow.ts";

describe("isReviewerDecisionStatus", () => {
  it("allows submitted and approved", () => {
    assert.equal(isReviewerDecisionStatus("submitted"), true);
    assert.equal(isReviewerDecisionStatus("approved"), true);
  });

  it("blocks other workflow statuses", () => {
    assert.equal(isReviewerDecisionStatus("draft"), false);
    assert.equal(isReviewerDecisionStatus("unpublished"), false);
    assert.equal(isReviewerDecisionStatus("published"), false);
    assert.equal(isReviewerDecisionStatus("rejected"), false);
    assert.equal(isReviewerDecisionStatus("changes_requested"), false);
  });
});

describe("isEditableStatus", () => {
  it("allows draft, changes_requested, and legacy unpublished", () => {
    assert.equal(isEditableStatus("draft"), true);
    assert.equal(isEditableStatus("changes_requested"), true);
    assert.equal(isEditableStatus("unpublished"), true);
    assert.equal(isEditableStatus("submitted"), false);
  });
});

describe("normalizeStatusOnEdit", () => {
  it("maps legacy unpublished to draft", () => {
    assert.equal(normalizeStatusOnEdit("unpublished"), "draft");
    assert.equal(normalizeStatusOnEdit("draft"), "draft");
  });
});

describe("canSubmitStatus", () => {
  it("allows editable workflow statuses", () => {
    assert.equal(canSubmitStatus("draft"), true);
    assert.equal(canSubmitStatus("changes_requested"), true);
    assert.equal(canSubmitStatus("unpublished"), true);
    assert.equal(canSubmitStatus("submitted"), false);
    assert.equal(canSubmitStatus("approved"), false);
  });
});

describe("submitStatusError", () => {
  it("guides on common blocked statuses", () => {
    assert.match(submitStatusError("submitted"), /Already submitted/);
    assert.match(submitStatusError("approved"), /request changes/);
    assert.match(submitStatusError("rejected"), /reopen/);
  });
});
