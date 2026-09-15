import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { unzipEntries } from "../src/lib/imports/minizip.ts";

describe("minizip", () => {
  it("round-trips stored and deflated entries built by fflate", () => {
    const fixture = zipSync({
      "hello.txt": strToU8("hello pachimanga"),
      "nested/data.bin": new Uint8Array([0, 1, 2, 250, 255]),
    });
    const out = unzipEntries(fixture);
    assert.equal(new TextDecoder().decode(out["hello.txt"]), "hello pachimanga");
    assert.deepEqual(Array.from(out["nested/data.bin"]), [0, 1, 2, 250, 255]);
  });

  it("rejects non-zip blobs with a clean error", () => {
    assert.throws(() => unzipEntries(new Uint8Array([1, 2, 3, 4])), /zip: /);
  });
});
