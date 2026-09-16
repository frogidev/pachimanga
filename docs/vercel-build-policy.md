# Vercel build policy

Pachimanga uses Vercel Git integration for the hosted Next.js application. `main` is the production branch and hosted-runtime changes are intended to deploy automatically.

## Runtime-change detection

`vercel.json` defines an `ignoreCommand` based on `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA`.

A build should continue when any of these hosted-runtime inputs changed:

- `src/**`
- `public/**`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `vercel.json`

When both comparison SHAs are valid and none of those paths changed, Vercel may safely ignore the deployment.

This intentionally avoids spending Hobby-plan build capacity on documentation, Hermes-only changes, tests by themselves, native/Tauri-only files, and GitHub-workflow-only changes. GitHub Actions quality/hygiene checks remain independent.

## Current defect — 2026-09-16

The current command directly runs a Git diff using both Vercel Git SHA variables. A recent preview failed before application compilation with:

```text
fatal: bad revision ''
```

The observed failure is consistent with `VERCEL_GIT_PREVIOUS_SHA` being empty or otherwise unavailable for that deployment context.

This means the existing ignored-build optimization is not fail-safe. It can prevent a deployment from starting even though the application itself has not failed to build.

### Required behavior

The next runtime change should make the ignored-build logic follow these rules:

1. if either SHA needed for comparison is missing, empty, or cannot be resolved, continue the Vercel build;
2. if both SHAs are valid, diff only the hosted-runtime path set above;
3. if a runtime path changed, continue the build;
4. if no runtime path changed, allow Vercel to ignore the deployment;
5. never treat a missing Git comparison base as a reason to fail the deployment.

Prefer a small script with explicit validation over increasingly complex shell quoting inside `vercel.json` if that makes the behavior easier to test and maintain.

## Why this exists

The project uses the Vercel Hobby plan and previously exhausted build-rate capacity during documentation/agent-heavy commit bursts. Skipping non-runtime builds preserves capacity for real application changes without disabling automatic production deployment.

A Vercel build-rate-limit event, ignored-build failure, application compilation failure, and production runtime failure are different failure classes and must be reported separately.

## Safety rules

- Do not remove a path from the runtime list if changing that path can affect hosted Next.js output.
- Add new build/runtime configuration files to both runtime-change detection and Web Quality path detection.
- Environment-variable changes in Vercel are outside Git-diff detection; redeploy intentionally after runtime environment changes.
- Supabase migrations and relay deployment are separate operational paths and should not require a frontend build unless hosted runtime code also changed.
- A missing/unusable Git comparison SHA must fail open to **build**, not fail closed to **error** or **skip**.
- A release-ready claim requires the intended runtime commit (or a runtime-equivalent descendant) to reach Vercel `READY` and pass production smoke checks.

## Current production drift

At the 2026-09-16 verification point:

- current `main`: `2f9f37c4647c8312e114962b4918e4181f8b99ac`;
- latest verified production deployment: `dpl_xpxK7S5rG1EVmAoT1jBw6cgVutPv`;
- production commit: `626dbb5aea35ea186107fdb923737ed1ef9dfde8`;
- production was three commits behind current `main`.

Do not claim PRs #40-#42 are live until a newer READY production deployment contains their runtime-equivalent changes and Production Smoke passes.