import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "<<<<<<<";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|js|mjs|css|json|md|mdx|sql|yml|yaml|toml)$/.test(entry)) yield full;
  }
}

test("repo contains no committed merge-conflict markers", () => {
  const offenders: string[] = [];
  for (const file of walk(join(ROOT, "src"))) {
    if (readFileSync(file, "utf8").includes(MARKER)) offenders.push(file);
  }
  for (const file of ["public/sw.js", "next.config.ts", "package.json", "README.md", "AGENTS.md"]) {
    try {
      if (readFileSync(join(ROOT, file), "utf8").includes(MARKER)) offenders.push(file);
    } catch {
      // Optional file absent.
    }
  }
  assert.deepEqual(offenders, []);
});
