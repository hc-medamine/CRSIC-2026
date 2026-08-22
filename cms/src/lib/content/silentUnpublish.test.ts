import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldNotifyUnpublish, unpublishMutateMaybeRebuild } from "./silentUnpublish";

describe("shouldNotifyUnpublish", () => {
  it("defaults to true and honors notify:false", () => {
    assert.equal(shouldNotifyUnpublish(), true);
    assert.equal(shouldNotifyUnpublish({}), true);
    assert.equal(shouldNotifyUnpublish({ notify: true }), true);
    assert.equal(shouldNotifyUnpublish({ notify: false }), false);
  });
});

describe("unpublishMutateMaybeRebuild", () => {
  it("skips rebuild when rebuild is false", async () => {
    let rebuilt = 0;
    const out = await unpublishMutateMaybeRebuild(
      "id-1",
      async () => "ok",
      async () => {
        rebuilt += 1;
      },
      { rebuild: false },
    );
    assert.equal(out, "ok");
    assert.equal(rebuilt, 0);
  });
});
