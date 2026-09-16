# Vercel build policy

Pachimanga uses Vercel Git integration for the hosted Next.js application. `main` is the production branch and hosted-runtime changes are intended to deploy automatically.

## Runtime-change detection

`vercel.json` runs:

```text
node scripts/vercel-ignore-build.mjs
```

The helper reads `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA` and deliberately fails open to **continue the build** unless it can prove that a valid comparison contains no hosted-runtime changes.

A build continues when any of these hosted-runtime inputs changed:

- `src/**`
- `public/**`
- `scripts/vercel-ignore-build.mjs`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `vercel.json`

When both comparison SHAs resolve to commits and none of those paths changed, the helper exits successfully so Vercel may ignore the deployment.

This intentionally avoids spending Hobby-plan build capacity on documentation, Hermes-only changes, tests by themselves, native/Tauri-only files, and GitHub-workflow-only changes. GitHub Actions quality/hygiene checks remain independent.

## Fail-open rules

The ignored-build helper follows these rules:

1. if either SHA is missing or empty, continue the Vercel build;
2. if either SHA cannot be resolved as a commit, continue the build;
3. if Git cannot complete the comparison, continue the build;
4. if a hosted-runtime path changed, continue the build;
5. only when both SHAs are valid and no hosted-runtime path changed may Vercel ignore the deployment.

In Vercel ignored-build semantics, exit code `0` means ignore the build and exit code `1` means continue the build. Therefore uncertain comparison state must return `1`, not turn a missing comparison base into a deployment failure or skip.

## 2026-09-16 repair evidence

The previous inline Git diff could fail before application compilation with:

```text
fatal: bad revision ''
```

PR #44 replaced that inline command with the tested helper and added `tests/vercel-ignore-build.test.ts`.

The PR preview reproduced the missing-SHA condition after the repair:

```text
deployment: dpl_9hrLo73cW79RDxvGZFt6BukjYv8v
commit:     dfd30ff46a87fd76ec2c51bb51ba4a001771168b
state:      READY

Vercel ignore build: missing comparison SHA; continuing build.
```

The merged runtime commit then proved the normal runtime-change path:

```text
commit:     a5a008f1a5916240358743abd741cda993062ea4
deployment: dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs
state:      READY

Vercel ignore build: hosted-runtime changes detected; continuing build.
```

Required PR checks were successful before merge: Repository Hygiene run `35111974840`, Web Quality run `35111974946`, and Native Quality run `35111975250`. Web Quality completed unit tests, lint, typecheck, and production build successfully.

Post-deploy Production Smoke was explicitly re-run against `https://pachimanga.frogilab.dev` as workflow run `35096959939`, rerun job `104849686289`, and passed all 9 protected-route checks plus the PWA public/manifest/service-worker/icon checks. Post-deploy Vercel production error/fatal logs for `dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs` were empty in the inspected window.

## Why this exists

The project uses the Vercel Hobby plan and previously exhausted build-rate capacity during documentation/agent-heavy commit bursts. Skipping non-runtime builds preserves capacity for real application changes without disabling automatic production deployment.

A Vercel build-rate-limit event, ignored-build comparison failure, application compilation failure, and production runtime failure are different failure classes and must be reported separately.

## Safety rules

- Do not remove a path from the runtime list if changing that path can affect hosted Next.js output.
- Add new build/runtime configuration files to both runtime-change detection and Web Quality path detection.
- Keep `scripts/vercel-ignore-build.mjs` itself in both runtime-change lists.
- Environment-variable changes in Vercel are outside Git-diff detection; redeploy intentionally after runtime environment changes.
- Supabase migrations and relay deployment are separate operational paths and should not require a frontend build unless hosted runtime code also changed.
- A missing/unusable Git comparison SHA must fail open to **build**, not fail closed to **error** or **skip**.
- A release-ready claim requires the intended runtime commit (or a runtime-equivalent descendant) to reach Vercel `READY` and pass production smoke checks.

## Current production state

At the post-repair 2026-09-16 verification point:

- runtime commit: `a5a008f1a5916240358743abd741cda993062ea4`;
- production deployment: `dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs`;
- deployment state: `READY`;
- custom alias: `https://pachimanga.frogilab.dev`;
- Production Smoke: passed after deployment;
- post-deploy runtime error/fatal inspection: clean in the selected window.

The earlier three-runtime-commit production drift is closed.
