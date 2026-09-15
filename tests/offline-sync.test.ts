import assert from "node:assert/strict";
import test from "node:test";
import { uniquePageUrls } from "../src/lib/offline/chapter-cache.ts";
import { ACCOUNT_BOUND_IDB_STORES, sortOutboxByTime } from "../src/lib/offline/sync.ts";

test("uniquePageUrls dedupes and drops blanks, preserving order", () => {
  const urls = uniquePageUrls([
    { imageUrl: "https://cdn.example/p1.jpg" },
    { imageUrl: "  " },
    { imageUrl: "https://cdn.example/p1.jpg" },
    { imageUrl: "https://cdn.example/p2.jpg" },
  ]);
  assert.deepEqual(urls, ["https://cdn.example/p1.jpg", "https://cdn.example/p2.jpg"]);
});

test("account-bound cache stores include the sync outbox", () => {
  assert.deepEqual(ACCOUNT_BOUND_IDB_STORES, ["library", "progress", "history", "outbox"]);
});

test("sortOutboxByTime orders oldest-first for last-write-wins flush", () => {
  const sorted = sortOutboxByTime([
    { updatedAt: "2026-09-15T10:00:02Z" },
    { updatedAt: "2026-09-15T10:00:01Z" },
    { updatedAt: "2026-09-15T10:00:03Z" },
  ]);
  assert.deepEqual(
    sorted.map((e) => e.updatedAt),
    ["2026-09-15T10:00:01Z", "2026-09-15T10:00:02Z", "2026-09-15T10:00:03Z"],
  );
});
