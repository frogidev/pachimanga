---
name: pachimanga-ops
description: GitHub/Vercel/production-operations skill for Pachimanga. Use for repository audits, branches/PRs, CI failures, deployment readiness, Vercel previews/production deploys, production smoke checks, release gating, or operational handoff. Requires exact commit/deployment verification, green relevant checks, one-branch discipline, no direct-main shortcuts, explicit production mutation intent, post-deploy smoke/log inspection, and manual-only native release workflows during the PWA phase.
---

# Pachimanga operations and deployment

Use this skill for GitHub/Vercel/CI/deploy operations. `AGENTS.md` and `docs/WORKPLAN.md` remain authoritative.

## Boot audit

Before changing repository/deployment state:

1. Read `AGENTS.md` and the current workplan phase.
2. Resolve current `main` HEAD.
3. List open PRs relevant to the work.
4. Inspect active work branch and compare it to `main`.
5. Inspect relevant GitHub Actions status/logs. Actions was observed available again on 2026-09-19; if capacity becomes unavailable later, record that explicitly instead of retrying pushes.
6. Inspect latest Vercel production deployment for runtime work.
7. Confirm whether the user requested code only, merge, deployment, or production mutation. Do not broaden authority silently.

## Git/PR rules

- One focused branch per coherent workstream.
- No normal direct commits to `main`.
- No force push/history rewrite without explicit recovery intent.
- Never merge a PR with known required-check failures.
- If `main` moved, compare/update the branch intentionally before merge.
- Review changed filenames/diff before merge, even if CI is green.
- Keep native release workflows manual-only during the PWA phase.

## GitHub Actions availability

GitHub Actions was observed available again on 2026-09-19: PR #82 completed Repository Hygiene, Web Quality, and Native Quality successfully. Use the normal required checks.

If capacity/quota becomes unavailable again, do not weaken rulesets, do not report missing checks as passing, and do not create push churn attempting to obtain unavailable jobs. Use trustworthy local gates plus exact-head Vercel build evidence for runtime changes when practical and keep the missing hosted evidence explicit.

## CI failure protocol

When a check fails:

1. inspect the failing job/step/log;
2. identify the first real failure rather than later cascading errors;
3. reproduce locally when practical;
4. fix the smallest cause;
5. rerun/observe the relevant gate;
6. do not edit unrelated code or weaken the check simply to get green.

Conflict markers, auth/data leaks, secret exposure, broken reader/library, or widened network privileges are P0 blockers regardless of other green checks.

## Vercel preview gate

For runtime changes before merge:

- verify preview corresponds to the PR/head commit;
- wait for `READY`;
- inspect build logs if it fails;
- smoke the affected public/auth surface using the preview when possible;
- do not infer a successful production deploy from a successful preview alone.

## Production deploy protocol

Only treat a deployment as complete after:

1. intended changes are merged to `main`;
2. Vercel production deployment is for the exact expected `main` SHA;
3. deployment reaches `READY` with no alias error;
4. anonymous `/` resolves to the mandatory auth experience;
5. response/cache behavior remains private/no-store where expected;
6. affected authenticated flow is smoke-tested when credentials/context allow;
7. Vercel runtime error/fatal logs are inspected after smoke;
8. any provider/relay change has its own health/smoke verification.

Record deployment ID + commit SHA when release readiness matters.

## Production mutation boundary

A request to inspect/audit code is not permission to:

- apply a Supabase production migration;
- change production auth settings;
- delete/rewrite user data;
- rotate secrets;
- change DNS/relay infrastructure;
- create/publish a native release.

Require explicit user intent for those actions. Non-destructive Vercel deployment is allowed when the user explicitly asks to deploy and the merge/release gate is green.

## Native workflow policy

During the PWA phase:

- `android-apk.yml` manual-only;
- `android-release.yml` manual-only;
- `desktop-release.yml` manual-only;
- `ios-release.yml` manual-only.

Do not restore tag/push release triggers. Native artifact publication belongs to the final workplan phase.

## Branch protection task

`docs/WORKPLAN.md` treats GitHub protection/ruleset hardening as P0. When tools/permissions allow, configure and verify required PR/check behavior. If administration access is unavailable, report the exact missing capability instead of pretending protection was changed.

## Deployment incident protocol

If production is broken:

1. identify current production deployment/commit;
2. inspect Vercel build/runtime logs;
3. compare with previous known-good deployment;
4. reproduce against current `main`/preview;
5. fix on one focused branch;
6. pass required checks;
7. merge/deploy;
8. verify the exact new deployment and affected flow;
9. inspect runtime logs after recovery;
10. update workplan/docs if the incident exposed a process gap.

Do not randomly revert unrelated work or redeploy old code without understanding data/schema compatibility.

## Completion evidence

Keep the report concise. When the owner must validate locally, provide paste-ready PowerShell for `F:\LF\pachimanga`.

Report:

```text
Main SHA:
PR / merge SHA:
Checks observed:
Vercel deployment ID + state:
Smoke performed:
Runtime logs inspected:
Production mutations performed (if any):
Remaining blocker:
```

Never say deployed/green/protected/merged unless the corresponding system state was actually observed.