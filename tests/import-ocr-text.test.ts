import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanOcrLine, isOcrJunk, titlesFromOcrText } from "../src/lib/imports/ocr-text.ts";

describe("ocr-text junk filter", () => {
  it("drops badge numbers and symbol debris", () => {
    assert.equal(isOcrJunk("136"), true);
    assert.equal(isOcrJunk("10"), true);
    assert.equal(isOcrJunk("; YEN | 5"), true);
    assert.equal(isOcrJunk("[1%"), true);
    assert.equal(isOcrJunk("i 4"), true);
  });

  it("drops status-bar, nav-rail debris and app chrome", () => {
    assert.equal(isOcrJunk("PM Mon Sep 14 Tachimanga = @ 280% EM"), true);
    assert.equal(isOcrJunk("(a) Library Cy = 4d"), true);
    assert.equal(isOcrJunk("Bac G5"), true);
    assert.equal(isOcrJunk("Library X Tie Baily % lg 35"), true);
    assert.equal(isOcrJunk("Library"), true);
    assert.equal(isOcrJunk("Browse"), true);
    assert.equal(isOcrJunk("Updates"), true);
  });

  it("keeps real titles", () => {
    assert.equal(isOcrJunk("Overgeared"), false);
    assert.equal(isOcrJunk("Blue Lock"), false);
    assert.equal(isOcrJunk("That Time I Got Reincarnated as a Slime"), false);
  });

  it("extracts titles from a library screenshot transcript", () => {
    const text = "Library\n136\nOvergeared\n10\nLookism\n55\nBrowse\nEleceed\n; YEN | 5\nBlue Lock\nBlue Lock";
    assert.deepEqual(titlesFromOcrText(text), ["Overgeared", "Lookism", "Eleceed", "Blue Lock"]);
  });

  it("strips leading badge numbers from otherwise good lines", () => {
    assert.equal(cleanOcrLine("136 Overgeared"), "Overgeared");
  });
});
