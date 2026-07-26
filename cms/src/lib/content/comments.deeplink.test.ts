/**
 * Unit test: comment notification deep-links cover all 7 content types.
 * Run via: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commentDashboardPath } from "@/lib/content/comments";
import { contentPathSegment, type ContentType } from "@/lib/content/lifecycle";

const ALL_TYPES: ContentType[] = [
  "news",
  "event",
  "publication",
  "partner",
  "alert",
  "research_group",
  "research_project",
];

describe("commentDashboardPath", () => {
  it("maps every content type to /dashboard/{segment}/{id}", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    for (const type of ALL_TYPES) {
      const expected = `/dashboard/${contentPathSegment(type)}/${id}`;
      assert.equal(commentDashboardPath(type, id), expected);
    }
  });

  it("does not send research types to publications", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    assert.equal(
      commentDashboardPath("research_group", id),
      `/dashboard/research-groups/${id}`,
    );
    assert.equal(
      commentDashboardPath("research_project", id),
      `/dashboard/research-projects/${id}`,
    );
    assert.notEqual(
      commentDashboardPath("research_group", id),
      `/dashboard/publications/${id}`,
    );
    assert.notEqual(
      commentDashboardPath("research_project", id),
      `/dashboard/publications/${id}`,
    );
  });
});
