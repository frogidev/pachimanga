import assert from "node:assert/strict";
import test from "node:test";
import { hasMangaSourceShape } from "../src/sources/core/contract.ts";
import { parseSeriesIdFromUrl, weebCentralEndpoints } from "../src/sources/weebcentral/endpoints.ts";

test("source contract detects required adapter methods", () => {
  const source = {
    id: "test",
    name: "Test",
    search: async () => [],
    getManga: async () => ({}),
    getChapters: async () => [],
    getChapterPages: async () => [],
  };
  assert.equal(hasMangaSourceShape(source), true);
  assert.equal(hasMangaSourceShape({ id: "broken" }), false);
});

test("WeebCentral endpoint builder encodes untrusted identifiers", () => {
  assert.match(weebCentralEndpoints.search("one piece"), /text=one\+piece/);
  assert.equal(
    weebCentralEndpoints.chapter("abc/../def"),
    "https://weebcentral.com/chapters/abc%2F..%2Fdef",
  );
});

test("WeebCentral series id parses from backup source URLs", () => {
  assert.equal(
    parseSeriesIdFromUrl("https://weebcentral.com/series/01J76XYDMR2777KEM5BKTBBK83/Overgeared"),
    "01J76XYDMR2777KEM5BKTBBK83",
  );
  assert.equal(parseSeriesIdFromUrl("https://weebcentral.com/series/01J76XYDMR2777KEM5BKTBBK83"), "01J76XYDMR2777KEM5BKTBBK83");
  assert.equal(parseSeriesIdFromUrl("https://example.com/other"), null);
  assert.equal(parseSeriesIdFromUrl("not a url"), null);
});
