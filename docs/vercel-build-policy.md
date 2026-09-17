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

## Current production state — 2026-09-17

Latest observed hosted runtime deployment:

```text
deployment: dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN
runtime:    605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Observed repository `main`:

```text
ef67bc255134ec9bf033846bb8d062131195c715
```

That newer `main` commit is PR #52, which changes tests/operations/documentation but no hosted-runtime paths. Therefore production remaining on `605c723...` is expected and is evidence that valid non-runtime skipping still works rather than deployment drift.

User-operated production smoke against the current site passed 9 protected routes and 4 PWA icons. Recent production runtime error/fatal inspection was clean in the inspected window.

## Current validation mode

GitHub Actions capacity is unavailable for the remainder of the current month. This does not change the Vercel policy.

For runtime changes use:

1. local `npm ci` + `npm run verify`;
2. Vercel preview/build signal;
3. exact production deployment `READY` check after merge;
4. `node ops/production-smoke.mjs` against production;
5. Vercel production error/fatal inspection.

Do not disable ignored-build safety, auth boundaries, RLS, or cache isolation to compensate for unavailable Actions.

## Safety rules

- Do not remove a runtime path if changing it can affect hosted Next.js output.
- Add new hosted build/runtime configuration files to runtime detection.
- Keep the ignored-build helper itself in the runtime list.
- Environment variable changes are outside Git diff detection; redeploy intentionally after runtime environment changes.
- Supabase migrations and relay deployment are separate operational paths unless hosted runtime code also changes.
- Missing/unusable comparison history must fail open to **build**.
- Release-ready claims require the intended runtime commit (or runtime-equivalent descendant) to reach `READY` and pass production smoke.
