# Hermes local development

Pachimanga uses the root `AGENTS.md` plus project-local Hermes skills under `.hermes/skills/`.

The root agent contract is mandatory. Skills specialize the contract for a task; they do not override security, account isolation, git discipline, or release/post-release validation rules.

## First-time Windows setup

From PowerShell in the repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-hermes-local.ps1
```

By default this configures the local terminal backend, sets the repository working directory, trusts the project-local skill directory, and runs `hermes doctor`.

The script currently defaults to:

```text
F:\LF\pachimanga
```

If the checkout is elsewhere, pass `-RepoPath` explicitly instead of editing project rules around a machine-specific path.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-hermes-local.ps1 -RepoPath "D:\src\pachimanga"
```

## Start

```powershell
.\scripts\start-hermes.ps1
```

Or:

```powershell
Set-Location F:\LF\pachimanga
hermes
```

Hermes loads the root `AGENTS.md` as project context. Do not add `.hermes.md` casually: it has higher priority and could silently bypass the repository-wide contract. If one is ever introduced, it must intentionally preserve or strengthen the root invariants and be reviewed as a high-risk agent-configuration change.

## Current product state

PWA/web v0.4.0 is released. Post-release work remains PWA-first by default; native release workflows stay manual-only unless the user explicitly requests that phase.

## Mandatory Hermes boot sequence

Before editing code, Hermes must:

1. read `AGENTS.md`;
2. read `docs/WORKPLAN.md`;
3. load the task-specific project skill;
4. inspect current `main`, active branch, open PRs, and local working-tree state;
5. preserve unrelated local changes;
6. inspect Vercel/Supabase state when the task depends on them;
7. define one coherent scope and use one active work branch;
8. reproduce the issue first for bug-fix work when practical.

Hermes must not treat its own previous chat/session notes as authoritative repository state.

## Project-local skills

### `pachimanga-dev`

Default implementation/refactor/bug-fix workflow. Enforces branch discipline, PWA priority, quality gates, diff review, documentation maintenance, and no silent check suppression.

### `pachimanga-ui`

Frontend/PWA interaction and accessibility work. Requires mobile/desktop/standalone review and preserves auth/private-cache boundaries.

### `pachimanga-design`

Visual-system guardrail. Uses repository-controlled design rules from `docs/art-direction.md`, prevents one-off visual drift, and forbids dependence on untracked developer-local concept assets.

### `pachimanga-reader`

Reader-specific implementation/regression contract for page loading, long-strip layout, auto-scroll, controls, progress, preload, offline/reconnect, and accessibility.

### `pachimanga-supabase`

Auth/RLS/schema/sync/account-owned persistence workflow. Separates migration authoring from production mutation and requires explicit approval for destructive/production data changes.

### `pachimanga-review`

Pre-merge/release/post-release audit. Treats auth leaks, data isolation failures, broken reader/library flows, conflict markers, secret exposure, and failing gates as merge blockers.

### `pachimanga-ops`

GitHub/Vercel/production operations workflow. Use for branch/PR/CI/deployment audits, production smoke checks, release evidence, and keeping native workflows manual-only unless native distribution is explicitly requested.

## Skill selection

Use the most specific skill for the task. Examples:

- layout/polish -> `pachimanga-ui` + visual rules from `pachimanga-design`;
- reader behavior -> `pachimanga-reader`;
- database/auth -> `pachimanga-supabase`;
- pre-merge audit -> `pachimanga-review`;
- deploy/CI/PR operations -> `pachimanga-ops`;
- general implementation -> `pachimanga-dev`.

When a task crosses boundaries, load the primary skill first and explicitly preserve the constraints of the secondary domain. Do not create parallel branches just because multiple skills are involved.

## Strict execution rules

Hermes must not:

- edit `main` directly for normal work;
- create multiple branches for the same workstream;
- discard unrelated local changes;
- force-push published history without explicit recovery intent;
- merge with failing required checks;
- broadly disable lint/type rules to get green;
- delete/skip failing tests to get green;
- expose guest/demo/mock production behavior;
- mutate production Supabase state merely because code changes were requested;
- deploy production merely because a local build passes;
- re-enable automatic native release triggers during the PWA phase;
- claim checks/deployments were performed when they were not observed.

## Local worker delegation

If Hermes delegates implementation to another local model/tool, Hermes remains responsible for the result.

Delegated output must be treated as untrusted until Hermes:

1. re-reads the complete diff;
2. checks for partial/broken JSX/TypeScript or abandoned edits;
3. checks security/account/source boundaries;
4. runs the relevant quality gate itself;
5. updates documentation/workplan when required.

A worker's self-report is never proof of correctness.

## Required closeout

For substantive work, Hermes should leave a concise state record containing:

```text
Branch / PR:
Main HEAD observed:
Scope completed:
Checks actually run/observed:
Deployment state if relevant:
Known blockers:
WORKPLAN updates:
Exact next task:
```

If the work changed runtime behavior, the workplan must contain the next production verification step rather than only saying “test later.”

## Native pause

Native source may be maintained when required for compatibility/security, but platform packaging/distribution work remains deferred. Android/desktop/iOS release workflows must remain manual-only until the final workplan phase or an explicit user priority change.