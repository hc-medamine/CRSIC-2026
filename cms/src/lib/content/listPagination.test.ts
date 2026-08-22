import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIST_PAGE_MAX,
  buildContentListQuery,
  paginationBounds,
  parseListPage,
  trimHasMore,
} from "./listPagination";

describe("parseListPage", () => {
  it("defaults omitted, blank, and invalid values to 1", () => {
    assert.equal(parseListPage(undefined), 1);
    assert.equal(parseListPage(null), 1);
    assert.equal(parseListPage(""), 1);
    assert.equal(parseListPage("nope"), 1);
    assert.equal(parseListPage(0), 1);
    assert.equal(parseListPage(-3), 1);
  });

  it("clamps above LIST_PAGE_MAX", () => {
    assert.equal(parseListPage(3), 3);
    assert.equal(parseListPage("3"), 3);
    assert.equal(parseListPage(LIST_PAGE_MAX + 50), LIST_PAGE_MAX);
  });
});

describe("paginationBounds", () => {
  it("window ?page=3 is first 3 pages (take 60, limit 61, offset 0)", () => {
    const b = paginationBounds(3, 20, "window");
    assert.deepEqual(b, { page: 3, limit: 61, offset: 0, take: 60 });
  });

  it("page slice ?page=2 is LIMIT 21 OFFSET 20", () => {
    const b = paginationBounds(2, 20, "page");
    assert.deepEqual(b, { page: 2, limit: 21, offset: 20, take: 20 });
  });

  it("page=1 page slice is LIMIT 21 OFFSET 0", () => {
    const b = paginationBounds(1, 20, "page");
    assert.deepEqual(b, { page: 1, limit: 21, offset: 0, take: 20 });
  });
});

describe("trimHasMore", () => {
  it("LIMIT 21 trim: 21 rows → 20 + hasMore", () => {
    const rows = Array.from({ length: 21 }, (_, i) => i);
    assert.deepEqual(trimHasMore(rows, 20), { items: rows.slice(0, 20), hasMore: true });
  });

  it("short last page is not hasMore", () => {
    const rows = [1, 2, 3];
    assert.deepEqual(trimHasMore(rows, 20), { items: rows, hasMore: false });
  });
});

describe("buildContentListQuery", () => {
  it("uses $1 type, role, status, q, then LIMIT/OFFSET", () => {
    const sql = buildContentListQuery({
      contentType: "news",
      role: { kind: "author", userId: "u1" },
      q: "hello",
      status: "draft",
      limit: 21,
      offset: 20,
    });
    assert.match(sql.text, /recycled_at IS NULL/);
    assert.match(sql.text, /content_type = \$1/);
    assert.match(sql.text, /created_by = \$2/);
    assert.match(sql.text, /status = \$3/);
    assert.equal(sql.params.at(-2), 21);
    assert.equal(sql.params.at(-1), 20);
    assert.equal(sql.params[0], "news");
    assert.equal(sql.params[1], "u1");
    assert.equal(sql.params[2], "draft");
    assert.equal(sql.params[3], "hello");
  });
});
