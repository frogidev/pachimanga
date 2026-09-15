import assert from "node:assert/strict";
import test from "node:test";
import { uniquePageUrls } from "../src/lib/offline/chapter-cache.ts";
import {
  ACCOUNT_BOUND_IDB_STORES,
  LIBRARY_CONTENT_IDB_STORES,
  isStrictlyNewerTimestamp,
  newestByUpdatedAt,
  sortOutboxByTime,
  splitOutboxByUser,
} from "../src/lib/offline/sync.ts";

test("uniquePageUrls dedupes and drops blanks, preserving order", () => {
  const urls = uniquePageUrls([
    { imageUrl: "https://cdn.example/p1.jpg" },
    { imageUrl: "  " },
    { imageUrl: "https://cdn.example/p1.jpg" },
    { imageUrl: "https://cdn.example/p2.jpg" },
  ]);
  assert.deepEqual(urls, ["https://cdn.example/p1.jpg", "https://cdn.example/p2.jpg"]);
});

test("account-bound cache stores include progress and settings sync outboxes", () => {
  assert.deepEqual(ACCOUNT_BOUND_IDB_STORES, ["library", "progress", "history", "outbox", "settingsOutbox"]);
});

test("clearing the library preserves reader settings sync state", () => {
  assert.deepEqual(LIBRARY_CONTENT_IDB_STORES, ["library", "progress", "history", "outbox"]);
  assert.equal(LIBRARY_CONTENT_IDB_STORES.includes("settingsOutbox" as never), false);
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

test("strict freshness accepts only valid timestamps newer than the remote value", () => {
  assert.equal(isStrictlyNewerTimestamp("2026-09-15T10:00:03Z", "2026-09-15T10:00:02Z"), true);
  assert.equal(isStrictlyNewerTimestamp("2026-09-15T10:00:02Z", "2026-09-15T10:00:02Z"), false);
  assert.equal(isStrictlyNewerTimestamp("2026-09-15T10:00:01Z", "2026-09-15T10:00:02Z"), false);
  assert.equal(isStrictlyNewerTimestamp("2026-09-15T10:00:03Z", null), true);
  assert.equal(isStrictlyNewerTimestamp("not-a-date", "2026-09-15T10:00:02Z"), false);
});

test("newestByUpdatedAt keeps a newer pending local progress value", () => {
  const local = { updatedAt: "2026-09-15T10:00:03Z", value: "local" };
  const remote = { updatedAt: "2026-09-15T10:00:02Z", value: "remote" };
  assert.equal(newestByUpdatedAt(local, remote)?.value, "local");
});

test("newestByUpdatedAt adopts a newer remote value and remote wins ties", () => {
  const local = { updatedAt: "2026-09-15T10:00:02Z", value: "local" };
  const newerRemote = { updatedAt: "2026-09-15T10:00:03Z", value: "remote-newer" };
  const tiedRemote = { updatedAt: "2026-09-15T10:00:02Z", value: "remote-tie" };
  assert.equal(newestByUpdatedAt(local, newerRemote)?.value, "remote-newer");
  assert.equal(newestByUpdatedAt(local, tiedRemote)?.value, "remote-tie");
});

test("splitOutboxByUser never assigns another account or legacy queue entry", () => {
  const entries = [
    { userId: "user-a", chapterId: "a" },
    { userId: "user-b", chapterId: "b" },
    { chapterId: "legacy" },
  ];
  const { owned, stale } = splitOutboxByUser(entries, "user-a");
  assert.deepEqual(owned.map((entry) => entry.chapterId), ["a"]);
  assert.deepEqual(stale.map((entry) => entry.chapterId), ["b", "legacy"]);
});

test("splitOutboxByUser also isolates settings entries by account", () => {
  const entries = [
    { userId: "user-a", settings: "a" },
    { userId: "user-b", settings: "b" },
  ];
  const { owned, stale } = splitOutboxByUser(entries, "user-a");
  assert.deepEqual(owned.map((entry) => entry.settings), ["a"]);
  assert.deepEqual(stale.map((entry) => entry.settings), ["b"]);
});
