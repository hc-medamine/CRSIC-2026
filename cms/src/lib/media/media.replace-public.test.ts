import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediaReplaceAffectsPublic } from "./replacePublic";

describe("mediaReplaceAffectsPublic", () => {
  it("is false when unused", () => {
    assert.equal(mediaReplaceAffectsPublic([]), false);
  });

  it("is true when the item is published", () => {
    assert.equal(
      mediaReplaceAffectsPublic([{ status: "published", source: "image_path" }]),
      true,
    );
  });

  it("is true for a live public copy even if the row is back in draft", () => {
    assert.equal(
      mediaReplaceAffectsPublic([{ status: "draft", source: "live_payload" }]),
      true,
    );
  });

  it("is false for a draft-only attachment", () => {
    assert.equal(
      mediaReplaceAffectsPublic([{ status: "draft", source: "attachments" }]),
      false,
    );
  });
});
