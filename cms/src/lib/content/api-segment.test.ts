import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentTypeApiSegment } from "./api-segment";

describe("contentTypeApiSegment", () => {
  it("maps every owned type to its API folder", () => {
    assert.equal(contentTypeApiSegment("news"), "news");
    assert.equal(contentTypeApiSegment("event"), "events");
    assert.equal(contentTypeApiSegment("publication"), "publications");
    assert.equal(contentTypeApiSegment("partner"), "partners");
    assert.equal(contentTypeApiSegment("alert"), "alerts");
    assert.equal(contentTypeApiSegment("research_group"), "research-groups");
    assert.equal(contentTypeApiSegment("research_project"), "research-projects");
    assert.equal(contentTypeApiSegment("law"), "laws");
    assert.equal(contentTypeApiSegment("platform"), "platforms");
  });

  it("does not send laws or platforms to the alerts route", () => {
    assert.notEqual(contentTypeApiSegment("law"), "alerts");
    assert.notEqual(contentTypeApiSegment("platform"), "alerts");
  });
});
