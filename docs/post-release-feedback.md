# Post-release user feedback workflow

Pachimanga v0.4.0 is released. The default engineering mode is now iterative improvement driven by real user feedback.

## Priority

1. Fix reproducible user-facing defects.
2. Improve confusing or high-friction flows reported by users.
3. Address reliability, performance, accessibility, and responsive-layout regressions found in real use.
4. Improve existing features before expanding scope.
5. Defer speculative features unless they solve repeated feedback or a clearly documented product gap.

Keep PWA/web as the default product target. Native distribution remains a separate explicit phase.

## Autonomous execution

When feedback is actionable and the safe implementation is clear, proceed autonomously:

1. verify current `main`, open PRs, production state, and the relevant code;
2. reproduce or establish the concrete failure mode when practical;
3. implement the smallest complete fix on one focused branch;
4. add or update regression coverage;
5. update current-state documentation if behavior, operations, architecture, or product expectations changed;
6. run the applicable local quality gate;
7. use one final Vercel preview for runtime batches when practical;
8. merge only when repository rules and available evidence permit;
9. verify exact production `READY`, smoke when possible, and inspect recent error/fatal logs.

Do not stop for confirmation on routine implementation details. Ask only when a decision is genuinely ambiguous, destructive, security-sensitive, requires credentials/secrets, changes product direction, changes production data/schema without prior authorization, or starts native/platform distribution.

## GitHub Actions outage

GitHub Actions capacity is unavailable through September 30, 2026 and is expected to return October 1, 2026.

Until October 1:

- do not spend pushes attempting to obtain unavailable Actions evidence;
- do not treat missing/skipped Actions as a pass;
- do not weaken rulesets or quality/security checks as a workaround;
- batch changes before pushing;
- rely on trustworthy local verification plus Vercel exact-head build evidence for runtime work when available;
- keep the missing hosted CI evidence explicit.

On or after October 1, re-check actual Actions availability before assuming it has returned.

## Local validation handoff

When local validation is needed from the repository owner, always provide concise, paste-ready PowerShell commands for:

```text
F:\LF\pachimanga
```

Commands should:

- start with `Set-Location 'F:\LF\pachimanga'`;
- fetch/switch/pull the exact branch when relevant;
- show the expected commit SHA when relevant;
- run only the checks needed for the current stage;
- stop clearly on failure using `$LASTEXITCODE`;
- include production smoke commands only when they are actually needed;
- avoid telling the user to discard local changes unless those changes have first been understood.

Default full web gate:

```powershell
Set-Location 'F:\LF\pachimanga'

npm test
if ($LASTEXITCODE -ne 0) { throw "tests failed" }

npm run lint
if ($LASTEXITCODE -ne 0) { throw "lint failed" }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck failed" }

npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }
```

Equivalent aggregate gate:

```powershell
npm run verify
if ($LASTEXITCODE -ne 0) { throw "verify failed" }
```

## Communication style

Repository-work responses should be concise.

Prefer this order:

1. current status/result;
2. what changed;
3. exact validation evidence;
4. PowerShell commands only if the user needs to run something;
5. remaining blocker or next action.

Do not repeat long project history unless it is needed to explain a decision. Do not restate checks that were already observed unless they materially affect the next step.

## Feedback intake

Treat screenshots, error output, reproduction steps, and concrete user complaints as product evidence.

For each feedback item, classify internally as one of:

- bug/regression;
- UX clarity/friction;
- visual/theme/responsive;
- performance/reliability;
- accessibility;
- provider/data correctness;
- feature request.

Do not expose a scoring ceremony to the user unless requested. Prefer fixing high-confidence regressions immediately and grouping related low-risk improvements into one coherent batch to reduce deploy churn.

## Non-negotiable boundaries

User feedback never authorizes weakening:

- mandatory authentication;
- Supabase RLS/account ownership;
- private/no-store behavior;
- account-bound local/offline cache isolation;
- provider/relay restrictions;
- explicit provider failure states;
- secret handling;
- no-production-mock policy.

See `AGENTS.md`, `WORKPLAN.md`, and `operations.md` for the authoritative engineering and production contracts.
