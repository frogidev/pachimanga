import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { unzipEntries } from "../src/lib/imports/minizip.ts";

const CD_SIG = 0x02014b50;

function findCentralDirectory(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset <= bytes.byteLength - 4; offset += 1) {
    if (view.getUint32(offset, true) === CD_SIG) return offset;
  }
  return -1;
}

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

  it("rejects an entry when central-directory uncompressed size understates the payload", () => {
    const fixture = zipSync({ "payload.txt": strToU8("this is larger than one byte") });
    const altered = fixture.slice();
    const central = findCentralDirectory(altered);
    assert.notEqual(central, -1);
    new DataView(altered.buffer, altered.byteOffset, altered.byteLength).setUint32(central + 24, 1, true);
    assert.throws(() => unzipEntries(altered), /uncompressed size mismatch/);
  });
});
