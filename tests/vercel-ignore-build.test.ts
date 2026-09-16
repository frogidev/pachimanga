import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts/vercel-ignore-build.mjs");

function git(repo: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function createRepo() {
  const repo = mkdtempSync(join(tmpdir(), "pachimanga-vercel-ignore-"));
  git(repo, "init", "--quiet");
  git(repo, "config", "user.name", "Pachimanga Test");
  git(repo, "config", "user.email", "test@example.invalid");
  mkdirSync(join(repo, "docs"), { recursive: true });
  mkdirSync(join(repo, "src"), { recursive: true });
  mkdirSync(join(repo, "scripts"), { recursive: true });
  writeFileSync(join(repo, "docs/README.md"), "base\n");
  writeFileSync(join(repo, "src/runtime.ts"), "export const value = 1;\n");
  writeFileSync(join(repo, "scripts/vercel-ignore-build.mjs"), "// base\n");
  git(repo, "add", ".");
  git(repo, "commit", "--quiet", "-m", "base");
  return { repo, base: git(repo, "rev-parse", "HEAD") };
}

function commitFile(repo: string, path: string, content: string) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
  git(repo, "add", path);
  git(repo, "commit", "--quiet", "-m", `change ${path}`);
  return git(repo, "rev-parse", "HEAD");
}

function runIgnore(repo: string, previousSha: string, commitSha: string) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: repo,
    env: {
      ...process.env,
      VERCEL_GIT_PREVIOUS_SHA: previousSha,
      VERCEL_GIT_COMMIT_SHA: commitSha,
    },
    encoding: "utf8",
  });
}

test("continues build when a comparison SHA is missing", () => {
  const { repo, base } = createRepo();
  assert.equal(runIgnore(repo, "", base).status, 1);
  assert.equal(runIgnore(repo, base, "").status, 1);
});

test("continues build when a comparison SHA is unresolvable", () => {
  const { repo, base } = createRepo();
  assert.equal(runIgnore(repo, "deadbeef", base).status, 1);
  assert.equal(runIgnore(repo, base, "deadbeef").status, 1);
});

test("ignores docs-only builds when both SHAs are valid", () => {
  const { repo, base } = createRepo();
  const head = commitFile(repo, "docs/README.md", "docs only\n");
  assert.equal(runIgnore(repo, base, head).status, 0);
});

test("continues build when a hosted-runtime path changes", () => {
  const { repo, base } = createRepo();
  const head = commitFile(repo, "src/runtime.ts", "export const value = 2;\n");
  assert.equal(runIgnore(repo, base, head).status, 1);
});

test("continues build when the ignored-build helper changes", () => {
  const { repo, base } = createRepo();
  const head = commitFile(repo, "scripts/vercel-ignore-build.mjs", "// changed\n");
  assert.equal(runIgnore(repo, base, head).status, 1);
});
