import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listBulkChrome } from "./permissions";

function user(role: "super_admin" | "editor" | "reviewer") {
  return { id: "u", email: "u@crs.dz", displayName: "u", role };
}

describe("listBulkChrome", () => {
  it("Editor recycle only; Reviewer unpublish only; SA both", () => {
    assert.deepEqual(listBulkChrome(user("editor")), { canRecycle: true, canUnpublish: false });
    assert.deepEqual(listBulkChrome(user("reviewer")), { canRecycle: false, canUnpublish: true });
    assert.deepEqual(listBulkChrome(user("super_admin")), { canRecycle: true, canUnpublish: true });
  });
});
