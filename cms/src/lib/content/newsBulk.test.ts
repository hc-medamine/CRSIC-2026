import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEWS_BULK_MAX_IDS,
  executeNewsBulk,
  isNewsBulkAction,
  parseNewsBulkIds,
  skipReasonFromError,
  type NewsBulkDeps,
  type NewsBulkRow,
} from "./newsBulk";

function deps(overrides: Partial<NewsBulkDeps> & Pick<NewsBulkDeps, "role">): {
  impl: NewsBulkDeps;
  rebuilds: { n: number };
} {
  const rebuilds = { n: 0 };
  const impl: NewsBulkDeps = {
    role: overrides.role,
    loadNews: overrides.loadNews ?? (async () => null),
    unpublishSilent: overrides.unpublishSilent ?? (async (id) => ({ id, title: id })),
    recycle: overrides.recycle ?? (async () => undefined),
    rebuildNewsJson: overrides.rebuildNewsJson ?? (async () => {
      rebuilds.n += 1;
    }),
    restoreUnpublished: overrides.restoreUnpublished,
    pruneFeatured: overrides.pruneFeatured,
  };
  return { impl, rebuilds };
}

describe("isNewsBulkAction", () => {
  it("accepts unpublish and recycle only", () => {
    assert.equal(isNewsBulkAction("unpublish"), true);
    assert.equal(isNewsBulkAction("recycle"), true);
    assert.equal(isNewsBulkAction("publish"), false);
    assert.equal(isNewsBulkAction(""), false);
  });
});

describe("parseNewsBulkIds", () => {
  it("throws when ids is missing", () => {
    assert.throws(() => parseNewsBulkIds(undefined), /ids required/);
    assert.throws(() => parseNewsBulkIds("x"), /ids required/);
  });

  it("dedupes and skips blanks", () => {
    const { ids, skipped } = parseNewsBulkIds(["a", " a ", "", "a", "b"]);
    assert.deepEqual(ids, ["a", "b"]);
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].reason, "not_found");
  });

  it(`caps at ${NEWS_BULK_MAX_IDS} and skips the rest as too_many`, () => {
    const raw = Array.from({ length: NEWS_BULK_MAX_IDS + 3 }, (_, i) => `id-${i}`);
    const { ids, skipped } = parseNewsBulkIds(raw);
    assert.equal(ids.length, NEWS_BULK_MAX_IDS);
    assert.equal(skipped.length, 3);
    assert.ok(skipped.every((s) => s.reason === "too_many"));
  });
});

describe("skipReasonFromError", () => {
  it("maps known gate messages", () => {
    assert.equal(skipReasonFromError(new Error("Four-eyes: you cannot review your own item")).reason, "four_eyes");
    assert.equal(skipReasonFromError(new Error("Reviewer role required")).reason, "reviewer_required");
    assert.equal(skipReasonFromError(new Error("Super Admin role required")).reason, "not_sa");
    assert.equal(skipReasonFromError(new Error("Item is not published")).reason, "not_published");
    assert.equal(skipReasonFromError(new Error("Not found")).reason, "not_found");
    assert.equal(
      skipReasonFromError(new Error("You are marked Away (OOO). Review actions are frozen until Away is cleared or the until-date passes.")).reason,
      "away",
    );
    assert.equal(
      skipReasonFromError(new Error("Only unpublished or rejected items can be moved to the recycle bin")).reason,
      "wrong_status",
    );
    assert.equal(skipReasonFromError(new Error("Item is already in the recycle bin")).reason, "already_binned");
    assert.equal(skipReasonFromError(new Error("disk full")).reason, "other");
  });
});

describe("executeNewsBulk", () => {
  const catalog: Record<string, NewsBulkRow> = {
    pub1: { id: "pub1", title: "Live A", status: "published" },
    pub2: { id: "pub2", title: "Live B", status: "published" },
    own: { id: "own", title: "My story", status: "published" },
    off: { id: "off", title: "Taken down", status: "unpublished" },
    draft: { id: "draft", title: "WIP", status: "draft" },
  };

  const loadNews = async (id: string) => catalog[id] ?? null;

  it("skips every id when an Editor unpublishes (no rebuild)", async () => {
    const { impl, rebuilds } = deps({ role: "editor", loadNews });
    const result = await executeNewsBulk("unpublish", ["pub1", "pub2"], impl);
    assert.equal(result.done.length, 0);
    assert.equal(result.skipped.length, 2);
    assert.ok(result.skipped.every((s) => s.reason === "reviewer_required"));
    assert.equal(rebuilds.n, 0);
  });

  it("skips every id when a Reviewer recycles", async () => {
    const { impl, rebuilds } = deps({ role: "reviewer", loadNews });
    const result = await executeNewsBulk("recycle", ["off", "pub1"], impl);
    assert.equal(result.done.length, 0);
    assert.ok(result.skipped.every((s) => s.reason === "not_sa"));
    assert.equal(rebuilds.n, 0);
  });

  it("skips own published (four-eyes) and still unpublishes the rest with one rebuild", async () => {
    const { impl, rebuilds } = deps({
      role: "reviewer",
      loadNews,
      unpublishSilent: async (id) => {
        if (id === "own") throw new Error("Four-eyes: you cannot review your own item");
        return { id, title: catalog[id].title };
      },
    });
    const result = await executeNewsBulk("unpublish", ["pub1", "own", "pub2"], impl);
    assert.deepEqual(
      result.done.map((d) => d.id),
      ["pub1", "pub2"],
    );
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, "four_eyes");
    assert.equal(rebuilds.n, 1);
  });

  it("SA mixed recycle: unpublish-then-bin published, bin unpublished, skip draft; one rebuild", async () => {
    const recycled: string[] = [];
    const unpublished: string[] = [];
    const { impl, rebuilds } = deps({
      role: "super_admin",
      loadNews,
      unpublishSilent: async (id) => {
        unpublished.push(id);
        return { id, title: catalog[id].title };
      },
      recycle: async (id) => {
        recycled.push(id);
      },
    });
    const result = await executeNewsBulk("recycle", ["pub1", "off", "draft"], impl);
    assert.deepEqual(unpublished, ["pub1"]);
    assert.deepEqual(recycled, ["pub1", "off"]);
    assert.deepEqual(
      result.done.map((d) => d.id),
      ["pub1", "off"],
    );
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, "wrong_status");
    assert.equal(rebuilds.n, 1);
  });

  it("does not rebuild when every unpublish is skipped", async () => {
    const { impl, rebuilds } = deps({
      role: "reviewer",
      loadNews,
      unpublishSilent: async () => {
        throw new Error("Item is not published");
      },
    });
    const result = await executeNewsBulk("unpublish", ["off"], impl);
    assert.equal(result.done.length, 0);
    assert.equal(result.skipped[0].reason, "not_published");
    assert.equal(rebuilds.n, 0);
  });

  it("restores unpublished rows when the single rebuild fails", async () => {
    let restored = false;
    const { impl } = deps({
      role: "super_admin",
      loadNews,
      rebuildNewsJson: async () => {
        throw new Error("disk full");
      },
      restoreUnpublished: async () => {
        restored = true;
      },
    });
    await assert.rejects(() => executeNewsBulk("unpublish", ["pub1", "pub2"], impl), /disk full/);
    assert.equal(restored, true);
  });

  it("prunes featured only after a successful rebuild", async () => {
    const pruned: string[] = [];
    const { impl, rebuilds } = deps({
      role: "reviewer",
      loadNews,
      pruneFeatured: async (id) => {
        pruned.push(id);
      },
    });
    await executeNewsBulk("unpublish", ["pub1", "pub2"], impl);
    assert.equal(rebuilds.n, 1);
    assert.deepEqual(pruned, ["pub1", "pub2"]);
  });

  it("does not call pruneFeatured when the dep is omitted (events/publications)", async () => {
    const { impl, rebuilds } = deps({
      role: "reviewer",
      loadNews,
    });
    assert.equal(impl.pruneFeatured, undefined);
    await executeNewsBulk("unpublish", ["pub1"], impl);
    assert.equal(rebuilds.n, 1);
  });

  it("does not rebuild when SA recycles only unpublished/rejected rows", async () => {
    const recycled: string[] = [];
    const { impl, rebuilds } = deps({
      role: "super_admin",
      loadNews,
      recycle: async (id) => {
        recycled.push(id);
      },
    });
    const result = await executeNewsBulk("recycle", ["off"], impl);
    assert.deepEqual(recycled, ["off"]);
    assert.equal(result.done.length, 1);
    assert.equal(rebuilds.n, 0);
  });
});
