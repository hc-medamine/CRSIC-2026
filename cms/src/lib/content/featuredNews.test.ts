import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEATURED_NEWS_MAX,
  isUsingFallback,
  sanitizePlaylistEntries,
  sanitizePlaylistIds,
} from "./featuredNewsIds";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("sanitizePlaylistEntries", () => {
  it("accepts typed items and legacy bare ids as news", () => {
    assert.deepEqual(sanitizePlaylistEntries([{ type: "event", id: A }, B]), [
      { type: "event", id: A },
      { type: "news", id: B },
    ]);
  });

  it("dedupes by type+id and keeps order", () => {
    assert.deepEqual(
      sanitizePlaylistEntries([
        { type: "news", id: A },
        { type: "event", id: A },
        { type: "news", id: A },
        { type: "event", id: B },
      ]),
      [
        { type: "news", id: A },
        { type: "event", id: A },
        { type: "event", id: B },
      ],
    );
  });

  it("refuses an 11th item", () => {
    const ids = Array.from({ length: 11 }, (_, i) =>
      `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
    );
    assert.equal(ids.length, FEATURED_NEWS_MAX + 1);
    assert.throws(() => sanitizePlaylistEntries(ids), /cannot exceed 10/);
  });

  it("normalizes UUID case", () => {
    assert.deepEqual(sanitizePlaylistEntries([A.toUpperCase()]), [
      { type: "news", id: A },
    ]);
  });
});

describe("sanitizePlaylistIds", () => {
  it("keeps news ids only from mixed input", () => {
    assert.deepEqual(
      sanitizePlaylistIds([
        { type: "event", id: C },
        { type: "news", id: A },
        B,
      ]),
      [A, B],
    );
  });
});

describe("isUsingFallback", () => {
  it("is true when never published or live list is empty", () => {
    assert.equal(isUsingFallback(null, 0), true);
    assert.equal(
      isUsingFallback(
        {
          published_at: null,
        },
        0,
      ),
      true,
    );
    assert.equal(
      isUsingFallback(
        {
          published_at: new Date(),
        },
        1,
      ),
      false,
    );
  });
});
