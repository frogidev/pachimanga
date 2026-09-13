import assert from "node:assert/strict";
import test from "node:test";
import { isChapter, isManga, normalizeReadingProgress } from "../src/types/validation.ts";

test("manga and chapter validators reject incomplete records", () => {
  assert.equal(isManga({ id: "x", title: "Missing fields" }), false);
  assert.equal(isChapter({ id: "c", chapterNumber: "1" }), false);
});

test("reading progress is normalized to safe bounds", () => {
  const normalized = normalizeReadingProgress({
    mangaId: "m",
    chapterId: "c",
    pageIndex: -4.8,
    scrollPosition: -20,
    percentage: 140,
    updatedAt: "2026-09-12T00:00:00.000Z",
  });
  assert.equal(normalized.pageIndex, 0);
  assert.equal(normalized.scrollPosition, 0);
  assert.equal(normalized.percentage, 100);
});
