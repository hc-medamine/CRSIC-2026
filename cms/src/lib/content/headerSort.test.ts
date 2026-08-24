import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareText,
  compareValues,
  contentListSqlOrderBy,
  naturalDir,
  parseContentListSort,
  parseExportPickerSort,
  sortRows,
  statusRank,
  toggleHeaderSort,
} from "./headerSort";
import { buildContentListQuery } from "./listPagination";

describe("toggleHeaderSort", () => {
  it("first click uses natural direction; second click reverses", () => {
    const first = toggleHeaderSort(null, "title", "text");
    assert.deepEqual(first, { key: "title", dir: "asc" });
    assert.deepEqual(toggleHeaderSort(first, "title", "text"), { key: "title", dir: "desc" });
    const dateFirst = toggleHeaderSort(null, "updated", "date");
    assert.deepEqual(dateFirst, { key: "updated", dir: "desc" });
    assert.equal(naturalDir("number"), "desc");
    assert.deepEqual(toggleHeaderSort(null, "nav", "number", "asc"), { key: "nav", dir: "asc" });
  });
});

describe("comparators", () => {
  it("Arabic titles follow ar collation", () => {
    const rows = [{ title: "يوسف" }, { title: "أحمد" }, { title: "تقدير" }];
    const sorted = sortRows(
      rows,
      { key: "title", dir: "asc" },
      (row) => row.title,
      () => "text",
      "ar",
    );
    assert.deepEqual(
      sorted.map((r) => r.title),
      [...rows.map((r) => r.title)].sort((a, b) => compareText(a, b, "ar")),
    );
  });

  it("status follows workflow, not the alphabet", () => {
    assert.ok(statusRank("draft") < statusRank("published"));
    assert.ok(statusRank("published") < statusRank("rejected"));
    const rows = [{ status: "rejected" }, { status: "draft" }, { status: "published" }];
    const sorted = sortRows(
      rows,
      { key: "status", dir: "asc" },
      (row) => row.status,
      () => "status",
      "ar",
    );
    assert.deepEqual(
      sorted.map((r) => r.status),
      ["draft", "published", "rejected"],
    );
  });

  it("dates are chronological", () => {
    assert.ok(compareValues("date", "2026-01-01T00:00:00Z", "2026-08-01T00:00:00Z", "en") < 0);
  });

  it("counts are numeric", () => {
    assert.ok(compareValues("number", 2, 10, "en") < 0);
    assert.ok(compareValues("number", "10", "2", "en") > 0);
  });
});

describe("parseContentListSort + SQL", () => {
  it("ignores unknown keys", () => {
    assert.equal(parseContentListSort("drop", "asc"), null);
  });

  it("Load more ORDER BY uses the active sort key", () => {
    const title = contentListSqlOrderBy({ key: "title", dir: "asc" });
    assert.match(title, /title_ar ASC/);
    const sql = buildContentListQuery({
      contentType: "news",
      role: { kind: "all" },
      q: "",
      status: "",
      limit: 21,
      offset: 20,
      sort: { key: "title", dir: "asc" },
    });
    assert.match(sql.text, /ORDER BY title_ar ASC/);
    assert.doesNotMatch(sql.text, /ORDER BY updated_at DESC, id ASC/);
  });

  it("default SQL stays newest updated", () => {
    assert.match(contentListSqlOrderBy(null), /updated_at DESC/);
  });

  it("I/E picker sort ignores EN and keeps Load more ORDER BY", () => {
    assert.equal(parseExportPickerSort("en", "asc"), null);
    assert.equal(parseExportPickerSort("drop", "desc"), null);
    const title = parseExportPickerSort("title", "asc");
    assert.deepEqual(title, { key: "title", dir: "asc" });
    assert.match(contentListSqlOrderBy(title), /title_ar ASC/);
  });
});
