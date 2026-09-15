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

function collectMarkers(dir: string, offenders: string[]) {
  try {
    for (const file of walk(join(ROOT, dir))) {
      if (readFileSync(file, "utf8").includes(MARKER)) offenders.push(file);
    }
  } catch {
    // Optional directory absent.
  }
}

test("repo contains no committed merge-conflict markers", () => {
  const offenders: string[] = [];
  for (const dir of ["src", "docs", ".github", ".hermes", "scripts", "src-tauri", "supabase"]) {
    collectMarkers(dir, offenders);
  }
  for (const file of ["public/sw.js", "next.config.ts", "package.json", "README.md", "AGENTS.md", "NATIVE.md"]) {
    try {
      if (readFileSync(join(ROOT, file), "utf8").includes(MARKER)) offenders.push(file);
    } catch {
      // Optional file absent.
    }
  }
  assert.deepEqual(offenders, []);
});

test("service worker evicts only stale Pachimanga caches", () => {
  const serviceWorker = readFileSync(join(ROOT, "public/sw.js"), "utf8");
  assert.match(serviceWorker, /key\.startsWith\("pachimanga-"\) && key !== CACHE_VERSION/);
  assert.doesNotMatch(serviceWorker, /key !== CACHE_VERSION && !key\.startsWith\("pachimanga-"\)/);
});
