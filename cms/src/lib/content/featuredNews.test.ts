import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEATURED_NEWS_MAX,
  isUsingFallback,
  sanitizePlaylistIds,
} from "./featuredNewsIds";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("sanitizePlaylistIds", () => {
  it("keeps order and drops duplicate ids", () => {
    assert.deepEqual(sanitizePlaylistIds([A, B, A]), [A, B]);
  });

  it("refuses an 11th item", () => {
    const ids = Array.from({ length: 11 }, (_, i) =>
      `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
    );
    assert.equal(ids.length, FEATURED_NEWS_MAX + 1);
    assert.throws(() => sanitizePlaylistIds(ids), /cannot exceed 10/);
  });

  it("normalizes UUID case", () => {
    assert.deepEqual(sanitizePlaylistIds([A.toUpperCase()]), [A]);
  });
});

describe("isUsingFallback", () => {
  it("is true when never published or live list is empty", () => {
    assert.equal(isUsingFallback(null, 0), true);
    assert.equal(
      isUsingFallback(
        {
          id: 1,
          draft_ids: [],
          live_ids: [],
          updated_by: null,
          updated_at: new Date(),
          published_at: null,
        },
        0,
      ),
      true,
    );
    assert.equal(
      isUsingFallback(
        {
          id: 1,
          draft_ids: [A],
          live_ids: [A],
          updated_by: null,
          updated_at: new Date(),
          published_at: new Date(),
        },
        1,
      ),
      false,
    );
  });
});
