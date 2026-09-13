import assert from "node:assert/strict";
import test from "node:test";
import { getPreloadWindow } from "../src/features/reader/preload.ts";

const pages = Array.from({ length: 10 }, (_, index) => ({ index, imageUrl: `/page-${index}.jpg` }));

test("preload window only contains upcoming pages", () => {
  assert.deepEqual(getPreloadWindow(pages, 7, 2).map((page) => page.index), [8, 9]);
  assert.deepEqual(getPreloadWindow(pages, 9, 2), []);
});
