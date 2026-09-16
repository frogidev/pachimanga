# Production verification snapshot — 2026-09-16

This file records concrete project state observed during the current release-hardening pass. It is a dated snapshot, not a substitute for live checks.

## Repository

Observed `main` after the Vercel ignored-build repair:

```text
a5a008f1a5916240358743abd741cda993062ea4
```

That commit is the squash merge of PR #44, `fix: make Vercel ignored-build comparison fail open`.

At the start of the repair pass, `main` was `94f3bbf45ae55b30ef183f48d38e094857d795b7`. No open pull requests or issues were present before PR #44 was opened.

### Required merge controls

GitHub ruleset `Protect main` remains active for the default branch.

Verified rules:

- deletion blocked;
- non-fast-forward/force pushes blocked;
- pull requests required;
- review-thread resolution required;
- squash is the only allowed merge method;
- branches must be up to date;
- required GitHub Actions checks are `hygiene` and `quality`;
- no bypass actors are configured.

PR #44 merged only after the required checks were green. Observed successful runs for head commit `dfd30ff46a87fd76ec2c51bb51ba4a001771168b`:

```text
Repository Hygiene: run 35111974840, job hygiene, success
Web Quality:        run 35111974946, job quality, success
Native Quality:     run 35111975250, job quality, success
Vercel preview:     dpl_9hrLo73cW79RDxvGZFt6BukjYv8v, READY
```

Web Quality completed dependency installation, unit tests, lint, typecheck, and the production build successfully.

## Vercel ignored-build repair

The previously observed failure was reproduced from Vercel build logs:

```text
fatal: bad revision ''
```

The failure occurred before application compilation because the inline ignored-build command tried to diff an empty/unusable Vercel comparison SHA.

PR #44 replaced the inline Git command with `scripts/vercel-ignore-build.mjs` and added regression coverage. The helper follows fail-open-to-build semantics:

- missing comparison SHA -> continue build;
- unresolvable comparison SHA -> continue build;
- Git comparison error -> continue build;
- hosted-runtime change -> continue build;
- both SHAs valid and no hosted-runtime path changed -> ignore build.

The hosted-runtime path set includes the helper itself so changes to build-decision behavior cannot be accidentally skipped.

Targeted isolated regression coverage passed 5/5 before the PR was opened. Repository CI then ran the same test through the normal unit-test gate.

### Live preview proof of the missing-SHA case

Preview deployment for PR #44:

```text
deployment: dpl_9hrLo73cW79RDxvGZFt6BukjYv8v
commit:     dfd30ff46a87fd76ec2c51bb51ba4a001771168b
state:      READY
```

Its build log showed the exact previously failing condition handled safely:

```text
Running "node scripts/vercel-ignore-build.mjs"
Vercel ignore build: missing comparison SHA; continuing build.
Running "vercel build"
```

The application build then completed successfully.

### Production proof of the runtime-change case

Merged runtime commit:

```text
a5a008f1a5916240358743abd741cda993062ea4
```

Production deployment:

```text
deployment: dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs
state:      READY
commit:     a5a008f1a5916240358743abd741cda993062ea4
alias:      https://pachimanga.frogilab.dev
```

The production build log showed valid comparable SHAs and a runtime change correctly continuing the build:

```text
Running "node scripts/vercel-ignore-build.mjs"
Vercel ignore build: hosted-runtime changes detected; continuing build.
Running "vercel build"
```

The production deployment reached `READY` with no alias error.

## Post-deploy Production Smoke

The repository's existing Production Smoke `anonymous-boundary` job was explicitly re-run after `dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs` reached `READY`.

Evidence:

```text
workflow run: 35096959939
rerun job:    104849686289
result:       success
BASE_URL:     https://pachimanga.frogilab.dev
```

The job log reported:

```text
Production smoke passed for https://pachimanga.frogilab.dev
Protected routes checked: 9
PWA icons checked: 4
```

The smoke covers the anonymous authentication boundary and `private, no-store` cache policy across protected routes, the public auth/offline pages, manifest fields, required icons, and service-worker navigation/API/offline behavior.

A direct post-deploy production fetch also resolved anonymous application access to `/auth` with:

```text
cache-control: private, no-store
x-matched-path: /auth
```

## Post-deploy runtime errors

Vercel runtime logs were queried for deployment `dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs` after the smoke, filtering production `error` and `fatal` levels over the selected recent window.

Result:

```text
No logs found for the specified criteria.
```

No production runtime error/fatal was observed for the repaired deployment during the post-deploy verification window.

## Supabase

Production project:

```text
gwpgaojsemcfikgynxwv
```

The most recently verified state before this deployment-only repair was:

- project status `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- RLS enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`;
- owner-scoped policies in place;
- `anon` has no account-table or identity-sequence access;
- authenticated grants restricted to application-required operations;
- canonical timestamped migration history under `supabase/migrations/`;
- server-side newer-only guards for progress/history/settings;
- performance advisor clean;
- leaked-password protection remains the single accepted plan-limited security-advisor warning.

PR #44 did not change authentication, database, RLS, migrations, grants, synchronization, or secrets, so no production Supabase mutation was required for this repair.

## Synchronization and reader state

Current implementation retains the previously verified hardening:

- owner-bound progress and reader-settings outboxes;
- stale/cross-account queue entries are discarded;
- reconnect/boot delivery retry;
- newest local/remote reconciliation;
- server-side rejection of stale progress/history/settings writes;
- account-bound local fallbacks for library/history;
- exact local reader-position resume with synchronized percentage fallback for remote/cross-device state;
- resume restoration after chapter layout.

Library mutations intentionally remain remote-first/online-only unless a future workplan decision adds an owner-bound mutation queue.

## Provider/relay state

Previously verified hardening remains in place:

- one bounded retry only for transient network/socket failures or HTTP 502/503/504;
- no retry for 429, normal 4xx, authentication/refusal, validation errors, or caller aborts;
- bounded MangaDex and ComicK chapter pagination;
- explicit provider failure instead of mock fallback.

The WeebCentral relay stack was previously redeployed and its container observed healthy. PR #44 did not alter provider or relay behavior. Live provider/relay application evidence remains a P1 work item.

## Import hardening

Merged parser safety remains in place for JSON/Tachiyomi/Mihon/Tachimanga inputs, including schema-shaped validation, malformed-input errors, duplicate filtering, finite progress parsing, input/expansion bounds, and corrupt/unsupported backup handling.

Representative real backup files still require final end-to-end validation before release-candidate status.

## Remaining manual release blockers

The work that still inherently needs real identities/devices remains:

1. fresh-account registration/confirmation/password-reset lifecycle;
2. same-browser Account A/B isolation;
3. same-account two-session/two-device progress/history/settings validation;
4. installed-PWA validation on iPhone/iPad, Android, and desktop Chromium;
5. service-worker update behavior on an actually installed PWA.

Do not fabricate completion of those items.

## Exact next autonomous work

The Vercel deployment-gap P0 is closed. Continue, without private identities or device claims, through:

1. live provider/relay smoke where credentials are not required;
2. reader/import release validation that can be automated safely;
3. browser E2E automation;
4. performance/observability/cleanup;
5. PWA release-candidate preparation while leaving real-account and installed-device evidence explicitly open.
