---
name: pachimanga-dev
description: Local development workflow for the frogidev/pachimanga repository. Use for implementing features, fixing bugs, refactoring, reviewing code, running tests, or making repository changes in Pachimanga. Prioritize the PWA/Next.js product, follow AGENTS.md and docs/WORKPLAN.md, keep changes focused, and defer native platform release work unless explicitly requested.
---

# Pachimanga Development

Work from the repository root and treat `AGENTS.md` as authoritative project context.

## Workflow

1. Read `AGENTS.md` and `docs/WORKPLAN.md` before substantive changes.
2. Inspect `git status`, current branch, and recent diff before editing. Never discard unrelated local work.
3. Keep the active product target PWA/web. Do not spend time on Android, iOS, macOS, Windows, or Linux release work unless the user explicitly asks.
4. Prefer the smallest coherent change. Reuse existing architecture and components before adding abstractions.
5. Preserve mandatory authentication, Supabase RLS boundaries, per-user cache isolation, private/no-store behavior, and source security constraints.
6. Use real source/error states. Do not introduce guest, demo, or production mock fallback behavior.
7. Run focused checks while iterating, then the full project quality gate before declaring completion.
8. Review the final diff for accidental generated files, secrets, debug logging, unrelated formatting churn, and native-release changes.
9. Summarize only what changed, what was validated, and any remaining blocker.

## Local AI delegation

`opencode run --model ollama/gpt-oss:20b` is the VRAM-safe local worker
(qwen3-coder:30b exceeds the 16GB GPU and is banned). Scope it to one file
and one concern per task with exact anchor lines: it handles copy/class edits
well but produces broken JSX and abandoned half-edits on structural work.
Always re-read its diff, repair by hand where needed, and run the quality gate
yourself — never trust its self-report of completion.

## Git behavior

- Prefer working on the currently designated work branch when one exists.
- Do not create multiple parallel branches.
- Do not force-push, rewrite published history, deploy production, create releases, or alter production data unless explicitly requested.
- Keep commits focused and descriptive.

## Quality gate

From the repo root run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

If a command is unavailable because dependencies are not installed, report that rather than silently skipping validation.
