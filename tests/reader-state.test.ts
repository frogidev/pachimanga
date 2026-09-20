import assert from "node:assert/strict";
import test from "node:test";
import { initialReaderState, readerReducer, readerResumeScrollTop } from "../src/features/reader/reader-state.ts";
import { preserveCompletedPercentage, shouldCloseReaderAfterCompletion } from "../src/features/reader/completion.ts";

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


test("completed chapters keep 100 percent when reopened and scrolled", () => {
  assert.equal(preserveCompletedPercentage(100, 12), 100);
  assert.equal(preserveCompletedPercentage(99, 47), 100);
  assert.equal(preserveCompletedPercentage(40, 65), 65);
});

test("reader only auto-closes when the last chapter becomes complete in this session", () => {
  assert.equal(shouldCloseReaderAfterCompletion({
    wasCompleteOnOpen: false,
    isLastAvailableChapter: true,
    observedPercentage: 99,
    alreadyClosing: false,
  }), true);
  assert.equal(shouldCloseReaderAfterCompletion({
    wasCompleteOnOpen: true,
    isLastAvailableChapter: true,
    observedPercentage: 100,
    alreadyClosing: false,
  }), false);
  assert.equal(shouldCloseReaderAfterCompletion({
    wasCompleteOnOpen: false,
    isLastAvailableChapter: false,
    observedPercentage: 100,
    alreadyClosing: false,
  }), false);
});


test("completed chapters reopen from the top for rereading", () => {
  assert.equal(readerResumeScrollTop({ scrollPosition: 9000, percentage: 100 }, 10_000, 1000), 0);
});
