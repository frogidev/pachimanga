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

test("Supabase active migrations mirror the canonical timestamped production chain", () => {
  const migrationDir = join(ROOT, "supabase/migrations");
  const migrations = readdirSync(migrationDir).filter((entry) => entry.endsWith(".sql")).sort();
  const required = [
    "20260913122954_initial_pachimanga_user_sync.sql",
    "20260913124558_pachimanga_sync_history.sql",
    "20260915053221_drop_redundant_library_index.sql",
    "20260915080009_revoke_anon_account_table_privileges.sql",
    "20260915080109_tighten_account_role_privileges.sql",
  ];

  for (const filename of required) {
    assert.ok(migrations.includes(filename), `missing canonical Supabase migration ${filename}`);
  }

  for (const filename of migrations) {
    assert.match(filename, /^\d{14}_[a-z0-9_]+\.sql$/, `${filename} must use a Supabase timestamp prefix`);
    assert.doesNotMatch(
      readFileSync(join(migrationDir, filename), "utf8"),
      /public\.user_library/,
      `${filename} must not restore the obsolete user_library schema`,
    );
  }

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
