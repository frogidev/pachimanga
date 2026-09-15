import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectTmbKind } from "../src/lib/imports/tmb-format.ts";

function bytesFromText(text: string): Uint8Array {
  return Uint8Array.from(text.split("").map((c) => c.charCodeAt(0)));
}

describe("tmb-format detection", () => {
  it("detects zipped backups by magic bytes", () => {
    assert.equal(detectTmbKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])), "zip");
  });

  it("detects raw sqlite backups by header", () => {
    const bytes = new Uint8Array(20);
    bytes.set(bytesFromText("SQLite format 3\0"));
    assert.equal(detectTmbKind(bytes), "sqlite");
  });

  it("rejects unknown blobs instead of crashing the unzipper", () => {
    assert.equal(detectTmbKind(new Uint8Array([1, 2, 3, 4, 5])), "unknown");
    assert.equal(detectTmbKind(new Uint8Array([])), "unknown");
  });
});
