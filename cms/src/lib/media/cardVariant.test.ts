import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardPublicPathForMaster } from "./cardVariant.ts";

describe("cardPublicPathForMaster", () => {
  it("derives -card.jpg from master paths", () => {
    assert.equal(cardPublicPathForMaster("img/cms/news/a.png"), "img/cms/news/a-card.jpg");
    assert.equal(cardPublicPathForMaster("img/cms/news/a.jpg"), "img/cms/news/a-card.jpg");
  });

  it("leaves existing card paths unchanged", () => {
    assert.equal(
      cardPublicPathForMaster("img/cms/news/a-card.jpg"),
      "img/cms/news/a-card.jpg",
    );
  });
});
