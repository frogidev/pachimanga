# Vercel build policy

Pachimanga uses Vercel Git integration for the hosted Next.js application. `main` is the production branch and hosted-runtime changes are intended to deploy automatically.

## Runtime-change detection

`vercel.json` runs:

```text
node scripts/vercel-ignore-build.mjs
```

The helper reads `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA` and fails open to **continue the build** unless it can prove a valid comparison contains no hosted-runtime changes.

Hosted-runtime inputs include:

- `src/**`
- `public/**`
- `scripts/vercel-ignore-build.mjs`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `vercel.json`

Tests, docs, Hermes-only changes, native-only files, and GitHub workflow-only changes do not by themselves require a hosted runtime build.

## Fail-open rules

The helper continues the build when:

1. either SHA is missing/empty;
2. either SHA cannot resolve to a commit;
3. Git comparison fails;
4. any hosted-runtime path changed.

Only a valid comparison proving no hosted-runtime changes may return Vercel's ignore-build success code.

This repaired the former pre-compilation failure:

```text
fatal: bad revision ''
```

PR #44 added the helper and regression coverage.

## Repair evidence

Missing comparison SHA preview:

```text
deployment: dpl_9hrLo73cW79RDxvGZFt6BukjYv8v
commit:     dfd30ff46a87fd76ec2c51bb51ba4a001771168b
state:      READY
```

Initial repaired production deployment:

```text
deployment: dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs
commit:     a5a008f1a5916240358743abd741cda993062ea4
state:      READY
```

The policy has remained in effect through later runtime deployments.

## Current production state — 2026-09-20

Released hosted line: v1.0.2.

Current runtime/deployment state and release evidence are recorded in `verification-release-2026-09-20.md`.

Current production evidence:

- PR #85 final head passed Repository Hygiene, Web Quality, Native Quality, and Vercel preview validation.
- squash merge `c48a057b30861b93124020822561eea7f7a9f8f4` reached production deployment `dpl_2MvvLYSXBf3u9hjdAULZfXDSFBb2` in `READY`.
- the inspected post-merge production `error`/`fatal` window was empty.
- the repository owner reported the post-deploy Production Smoke passed.

Repository Hygiene and Web Quality remain the normal repository gates. GitHub Actions is currently available, including successful Repository Hygiene, Web Quality, and Native Quality on PR #85. For subsequent runtime changes use the feedback workflow in `post-release-feedback.md`, then:

1. Repository Hygiene + Web Quality, including install, tests, lint, typecheck, and production build;
2. local `npm ci` + `npm run verify` when available;
3. Vercel preview/build signal when platform capacity permits;
4. exact production deployment `READY` check after merge;
5. `node ops/production-smoke.mjs` against production;
6. Vercel production error/fatal inspection.

A Vercel build-rate-limit status is not a successful preview and must not be relabeled as one. It also must not be worked around by weakening ignored-build safety, auth boundaries, RLS, or cache isolation.

## Safety rules

- Do not remove a runtime path if changing it can affect hosted Next.js output.
- Add new hosted build/runtime configuration files to runtime detection.
- Keep the ignored-build helper itself in the runtime list.
- Environment variable changes are outside Git diff detection; redeploy intentionally after runtime environment changes.
- Supabase migrations and relay deployment are separate operational paths unless hosted runtime code also changes.
- Missing/unusable comparison history must fail open to **build**.
- Normal release-readiness evidence includes the intended runtime commit (or runtime-equivalent descendant) reaching `READY` plus Production Smoke. If the owner explicitly designates a release while exact-final smoke remains outstanding, record that residual gap explicitly rather than implying it passed.
