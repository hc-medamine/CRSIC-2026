import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  editorFor,
  itemInReviewerScope,
  shouldAssignOrgPublisher,
  type EditorClaim,
} from "./alignAuthorshipLogic";

const newsA: EditorClaim = {
  content_type: "news",
  org_unit_id: null,
  editor_id: "e-news",
  email: "news@crsic.dz",
  display_name: "News Ed",
};
const groupOrg1: EditorClaim = {
  content_type: "research_group",
  org_unit_id: "org-1",
  editor_id: "e-g1",
  email: "g1@crsic.dz",
  display_name: "G1",
};
const groupOrg2: EditorClaim = {
  content_type: "research_group",
  org_unit_id: "org-2",
  editor_id: "e-g2",
  email: "g2@crsic.dz",
  display_name: "G2",
};

describe("editorFor", () => {
  it("matches centre-wide types on null org first", () => {
    const hit = editorFor([newsA], "news", "centre");
    assert.equal(hit?.editor_id, "e-news");
  });

  it("matches research types on org, then type-only fallback", () => {
    const claims = [groupOrg1, groupOrg2];
    assert.equal(editorFor(claims, "research_group", "org-2")?.editor_id, "e-g2");
    assert.equal(editorFor(claims, "research_group", "org-missing")?.editor_id, "e-g1");
    assert.equal(editorFor(claims, "publication", "org-1"), null);
  });
});

describe("itemInReviewerScope (R1)", () => {
  const claimed = new Set(["org-a", "org-b"]);
  it("allows only claimed orgs", () => {
    assert.equal(itemInReviewerScope("org-a", claimed), true);
    assert.equal(itemInReviewerScope("org-z", claimed), false);
    assert.equal(itemInReviewerScope(null, claimed), false);
  });
});

describe("shouldAssignOrgPublisher", () => {
  const orgReviewer = "rev-1";
  const valid: Parameters<typeof shouldAssignOrgPublisher>[0] = {
    id: "rev-other",
    role: "reviewer",
    is_active: true,
    claimedOrgIds: ["org-a"],
  };

  it("does not overwrite a valid scoped Reviewer pick", () => {
    assert.equal(shouldAssignOrgPublisher(valid, "org-a", orgReviewer), false);
  });

  it("sets when empty, inactive, not reviewer, or unscoped", () => {
    assert.equal(shouldAssignOrgPublisher(null, "org-a", orgReviewer), true);
    assert.equal(
      shouldAssignOrgPublisher({ ...valid, is_active: false }, "org-a", orgReviewer),
      true,
    );
    assert.equal(
      shouldAssignOrgPublisher({ ...valid, role: "editor" }, "org-a", orgReviewer),
      true,
    );
    assert.equal(shouldAssignOrgPublisher(valid, "org-b", orgReviewer), true);
  });

  it("does nothing when the org has no Reviewer", () => {
    assert.equal(shouldAssignOrgPublisher(null, "org-a", null), false);
  });
});
