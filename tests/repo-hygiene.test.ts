import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "target", "dist", "build"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".yml", ".yaml", ".toml", ".sql", ".rs", ".xml", ".plist", ".html", ".css", ".txt"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function ext(path: string) {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i) : "";
}

test("repo contains no committed merge-conflict markers", () => {
  const offenders = walk(ROOT)
    .filter((path) => TEXT_EXTENSIONS.has(ext(path)))
    .filter((path) => /^(<{7}|={7}|>{7})(?: |$)/m.test(readFileSync(path, "utf8")))
    .map((path) => relative(ROOT, path));
  assert.deepEqual(offenders, []);
});

test("Supabase active migrations mirror the canonical timestamped production chain", () => {
  const active = readdirSync(join(ROOT, "supabase/migrations")).filter((entry) => entry.endsWith(".sql")).sort();
  assert.ok(active.length >= 6);
  for (const entry of active) assert.match(entry, /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.ok(existsSync(join(ROOT, "supabase/legacy-migrations")));
  assert.deepEqual(
    readdirSync(join(ROOT, "supabase/legacy-migrations")).filter((entry) => entry.endsWith(".sql")).sort(),
    ["001_auth_library.sql", "002_sync_tables.sql", "003_drop_redundant_library_index.sql"],
  );

  const config = readFileSync(join(ROOT, "supabase/config.toml"), "utf8");
  assert.match(config, /major_version\s*=\s*17/);
  assert.match(config, /\[db\.migrations\][\s\S]*enabled\s*=\s*true/);
});

test("service worker evicts only stale Pachimanga caches", () => {
  const serviceWorker = readFileSync(join(ROOT, "public/sw.js"), "utf8");
  assert.match(serviceWorker, /const CHAPTER_CACHE = "pachimanga-chapters-v1"/);
  assert.match(serviceWorker, /const ACTIVE_CACHES = new Set\(\[SHELL_CACHE, RUNTIME_CACHE, CHAPTER_CACHE\]\)/);
  assert.match(serviceWorker, /key\.startsWith\("pachimanga-"\) && !ACTIVE_CACHES\.has\(key\)/);
  assert.doesNotMatch(serviceWorker, /!ACTIVE_CACHES\.has\(key\) && !key\.startsWith\("pachimanga-"\)/);
});

test("production source registry excludes the mock provider", () => {
  const registry = readFileSync(join(ROOT, "src/sources/core/registry.ts"), "utf8");
  assert.match(registry, /weebCentralSource/);
  assert.match(registry, /mangaDexSource/);
  assert.match(registry, /comickSource/);
  assert.doesNotMatch(registry, /sources\/mock|mockSource/);
});

test("native artifact and release workflows remain manual-only during the PWA phase", () => {
  for (const file of ["android-apk.yml", "android-release.yml", "desktop-release.yml", "ios-release.yml"]) {
    const workflow = readFileSync(join(ROOT, ".github/workflows", file), "utf8");
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  }
});

test("browser-visible runtime code contains no public relay or service-role secret variable", () => {
  const runtimeFiles = walk(join(ROOT, "src"));
  for (const file of runtimeFiles) {
    if (!TEXT_EXTENSIONS.has(ext(file))) continue;
    const content = readFileSync(file, "utf8");
    assert.doesNotMatch(content, /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|RELAY_TOKEN|SECRET)/, relative(ROOT, file));
  }
});
