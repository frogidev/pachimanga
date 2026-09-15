import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prefersReducedMotion } from "../src/features/reader/prefers-reduced-motion.ts";

describe("prefersReducedMotion", () => {
  it("returns false outside a browser (no window)", () => {
    assert.equal(prefersReducedMotion(), false);
  });
});
