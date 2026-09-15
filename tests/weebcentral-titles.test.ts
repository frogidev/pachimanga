import assert from "node:assert/strict";
import test from "node:test";
import { parseChaptersHtml } from "../src/sources/weebcentral/parser.ts";

test("chapter titles drop Last Read badge text", () => {
  const id = "01J76XYDMR2777KEM5BKTBBK83";
  const html =
    `<a href="/chapters/${id}">Episode 140 <span class="x">Last Read 2026-09-01T21:25:59.712572Z</span></a>` +
    `<a href="/chapters/11J76XYDMR2777KEM5BKTBBK84">Episode 139</a>`;
  const rows = parseChaptersHtml(html, "M1");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "Episode 140");
  assert.equal(rows[0].chapterNumber, 140);
  assert.equal(rows[1].title, "Episode 139");
});
