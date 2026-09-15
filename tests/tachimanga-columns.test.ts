import { describe, it } from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { columnSet } from "../src/lib/imports/sqlite-schema.ts";

describe("tachimanga column probe", () => {
  it("reads columns from an empty table via pragma", async () => {
    const SQL = await initSqlJs({
      locateFile: () => "node_modules/sql.js/dist/sql-wasm.wasm",
    });
    const db = new SQL.Database();
    db.exec("CREATE TABLE Manga (id INTEGER, title TEXT, in_library INTEGER)");
    const cols = columnSet(db as never, "Manga");
    assert.equal(cols.has("id"), true);
    assert.equal(cols.has("title"), true);
    assert.equal(cols.has("in_library"), true);
    assert.equal(cols.has("nope"), false);
    db.close();
  });
});
