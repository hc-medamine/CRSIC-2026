import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packZip, unpackZip, crc32 } from "./zipStore";

describe("zipStore", () => {
  it("round-trips utf8 json and a binary file", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const packed = packZip([
      { name: "manifest.json", data: Buffer.from('{"ok":true}', "utf8") },
      { name: "files/cms/news/a.png", data: png },
    ]);
    const entries = unpackZip(packed);
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.name, "manifest.json");
    assert.equal(entries[0]?.data.toString("utf8"), '{"ok":true}');
    assert.deepEqual(entries[1]?.data, png);
  });

  it("crc32 is stable", () => {
    assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  });
});
