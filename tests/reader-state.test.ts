import assert from "node:assert/strict";
import test from "node:test";
import { initialReaderState, readerReducer } from "../src/features/reader/reader-state.ts";

test("reader can play, pause, and track page", () => {
  let state = readerReducer(initialReaderState, { type: "toggle-play" });
  assert.equal(state.autoScrollPlaying, true);
  state = readerReducer(state, { type: "page", index: 4 });
  assert.equal(state.currentPageIndex, 4);
  state = readerReducer(state, { type: "pause" });
  assert.equal(state.autoScrollPlaying, false);
});
