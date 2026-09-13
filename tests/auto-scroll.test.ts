import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateScrollDelta,
  clampElapsedMs,
  effectiveSpeed,
  nextMultiplier,
} from "../src/features/reader/auto-scroll.ts";

test("auto-scroll uses elapsed time rather than frame count", () => {
  assert.equal(calculateScrollDelta(100, 500), 50);
  assert.equal(calculateScrollDelta(120, 1000 / 60), 2);
  assert.equal(calculateScrollDelta(120, 1000 / 120), 1);
});

test("elapsed time is capped after background stalls", () => {
  assert.equal(clampElapsedMs(1500), 100);
  assert.equal(clampElapsedMs(-20), 0);
});

test("speed multiplier and preset stepping are deterministic", () => {
  assert.equal(effectiveSpeed(120, 1.5), 180);
  assert.equal(nextMultiplier(1, 1), 1.25);
  assert.equal(nextMultiplier(1, -1), 0.75);
});
