---
name: pachimanga-dev
description: Strict implementation workflow for frogidev/pachimanga. Use for features, bugs, refactors, tests, repository changes, or general engineering. Requires AGENTS.md + WORKPLAN boot checks, one focused branch, PWA-first scope, preservation of mandatory auth/RLS/account-cache/source boundaries, explicit quality gates, diff review, and documentation/workplan updates. Never bypass failing checks, expose demo behavior, mutate production data, or start native distribution unless explicitly authorized.
---

# Pachimanga development

`AGENTS.md` is the project contract. This skill specializes it; it never weakens it.

## Before editing

1. Read `AGENTS.md`, `docs/WORKPLAN.md`, and `docs/post-release-feedback.md` for feedback-driven work.
2. Check current `main`, open PRs, active branch, and `git status` when local git is available.
3. Preserve unrelated local changes.
4. Load a more specific project skill when the task is primarily UI, reader, Supabase, review, or deployment operations.
5. For Next.js framework API work, consult the installed Next.js 16 docs under `node_modules/next/dist/docs/` when available rather than relying on older remembered APIs.
6. Reproduce the current bug before editing when practical.

## Scope discipline

- Work on one coherent branch/workstream.
- Do not create parallel branches for successive fragments of the same task.
- Prefer the smallest complete change that fixes the actual issue.
- Do not redesign unrelated screens or refactor unrelated modules as collateral work.
- Keep PWA/web as the active delivery target.
- Post-release, prioritize concrete user feedback and improvements to existing flows over speculative expansion.
- When the fix is clear and safe, proceed autonomously instead of asking for routine implementation choices.
- GitHub Actions was observed available again on 2026-09-19. Use the normal required checks; if capacity/quota becomes unavailable again, do not burn pushes chasing unavailable CI and do not treat missing checks as passing.
- Native platform packaging/distribution is out of scope unless explicitly requested or the workplan final phase is active.

## Non-negotiable invariants

Preserve:

- mandatory Supabase authentication;
- no guest/demo/anonymous reader path;
- RLS on account-owned data;
- account-bound IndexedDB/localStorage ownership;
- private/no-store authenticated behavior where expected;
- real provider errors instead of production mock fallback;
- operation-limited WeebCentral relay/native bridge;
- manual-only native artifact/release workflows during the PWA phase.

## Implementation rules

- Reuse existing normalized models, source adapters, storage APIs, and shared UI before adding a parallel abstraction.
- Avoid broad eslint/TypeScript disables. A narrow exception needs a concrete false-positive justification.
- Never delete/skip a test only to make CI green.
- Never write secrets into code, fixtures, logs, docs, or example values.
- Do not rewrite already-applied migrations.
- Do not change production Supabase/Vercel/GitHub settings merely because code edits are requested.
- If behavior/architecture/operations changed, update the relevant docs and `docs/WORKPLAN.md` in the same workstream.

## Validation while iterating

Run the smallest useful check after each meaningful change, then the full applicable gate before completion.

Web/application final gate:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Equivalent aggregate command:

```powershell
npm run verify
```

Native-impacting changes also require:

```powershell
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

If dependencies/tools are unavailable, report exactly what could not run. Never convert “not run” into “passed.”

When owner-side local validation is needed, give concise paste-ready PowerShell rooted at `F:\LF\pachimanga`, including exact branch/SHA when relevant and `$LASTEXITCODE` guards.

## Final diff review

Before PR/merge, inspect the whole diff for:

- unrelated changes;
- conflict markers;
- secrets/private material;
- generated artifacts;
- debug logging;
- accidental workflow trigger changes;
- broad lint/type suppressions;
- stale documentation;
- guest/demo/mock production paths;
- widened source/native network privileges.

A failing gate or unresolved P0 security/data issue blocks merge.

## Local worker delegation

A delegated local model/tool is an untrusted implementation assistant, not an authority.

If using `opencode run --model ollama/gpt-oss:20b`, keep tasks narrow: one file/one concern with exact anchors. Do not use `qwen3-coder:30b` on the known 16GB setup. Regardless of worker, re-read the diff and run the gate yourself.

Do not accept worker self-reports as evidence of completion.

## Completion report

Keep the response concise and report only verified facts:

```text
Branch / PR:
Scope changed:
Checks run and results:
Deployment state if relevant:
Documentation/workplan updated:
Remaining blockers:
Exact next task:
```

Do not claim merged/deployed/production-safe state unless observed.