import assert from "node:assert/strict";
import test from "node:test";
import { initialReaderState, readerReducer, readerResumeScrollTop } from "../src/features/reader/reader-state.ts";

test("reader can play, pause, and track page", () => {
  let state = readerReducer(initialReaderState, { type: "toggle-play" });
  assert.equal(state.autoScrollPlaying, true);
  state = readerReducer(state, { type: "page", index: 4 });
  assert.equal(state.currentPageIndex, 4);
  state = readerReducer(state, { type: "pause" });
  assert.equal(state.autoScrollPlaying, false);
});

test("reader resume prefers exact local pixel position", () => {
  assert.equal(
    readerResumeScrollTop({ scrollPosition: 2400, percentage: 50 }, 10_000, 1000),
    2400,
  );
});

test("reader resume uses synced percentage when remote progress has no pixel offset", () => {
  assert.equal(
    readerResumeScrollTop({ scrollPosition: 0, percentage: 50 }, 10_000, 1000),
    4500,
  );
});

test("reader resume clamps stale pixel and percentage values to the current layout", () => {
  assert.equal(readerResumeScrollTop({ scrollPosition: 20_000, percentage: 10 }, 10_000, 1000), 9000);
  assert.equal(readerResumeScrollTop({ scrollPosition: 0, percentage: 120 }, 10_000, 1000), 9000);
  assert.equal(readerResumeScrollTop({ scrollPosition: 0, percentage: -5 }, 10_000, 1000), 0);
  assert.equal(readerResumeScrollTop({ scrollPosition: Number.NaN, percentage: Number.NaN }, 10_000, 1000), 0);
});
