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

test("production source registry excludes the mock provider", () => {
  const registry = readFileSync(join(ROOT, "src/sources/core/registry.ts"), "utf8");
  assert.match(registry, /weebCentralSource/);
  assert.match(registry, /mangaDexSource/);
  assert.match(registry, /comickSource/);
  assert.doesNotMatch(registry, /sources\/mock|mockSource/);
});

test("native artifact and release workflows remain manual-only during the PWA phase", () => {
  const workflows = [
    "android-apk.yml",
    "android-release.yml",
    "desktop-release.yml",
    "ios-release.yml",
  ];

  for (const workflow of workflows) {
    const source = readFileSync(join(ROOT, ".github/workflows", workflow), "utf8");
    assert.match(source, /^\s{2}workflow_dispatch:\s*$/m, `${workflow} must keep workflow_dispatch`);
    assert.doesNotMatch(source, /^\s{2}push:\s*$/m, `${workflow} must not run on push`);
    assert.doesNotMatch(source, /^\s{2}pull_request:\s*$/m, `${workflow} must not run on pull_request`);
    assert.doesNotMatch(source, /^\s{2}schedule:\s*$/m, `${workflow} must not run on a schedule`);
  }
});

test("browser-visible runtime code contains no public relay or service-role secret variable", () => {
  const forbidden = [
    "NEXT_PUBLIC_WEEBCENTRAL_RELAY_TOKEN",
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
  ];
  const offenders: string[] = [];

  for (const dir of ["src", "public"]) {
    for (const file of walk(join(ROOT, dir))) {
      const source = readFileSync(file, "utf8");
      if (forbidden.some((name) => source.includes(name))) offenders.push(file);
    }
  }

  assert.deepEqual(offenders, []);
});
