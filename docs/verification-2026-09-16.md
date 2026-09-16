# Production verification snapshot — 2026-09-16

This file records concrete project state observed during the current release-hardening pass. It is a dated snapshot, not a substitute for live checks.

## Repository

Observed `main`:

```text
2f9f37c4647c8312e114962b4918e4181f8b99ac
```

Latest merged work at that point was PR #42, `fix: restore reader progress after chapter layout`.

The latest repository query showed:

- no open pull requests;
- no open GitHub issues.

### Required merge controls

GitHub ruleset `Protect main` remains active for the default branch.

Verified rules:

- deletion blocked;
- non-fast-forward/force pushes blocked;
- pull requests required;
- review-thread resolution required;
- zero approving reviews required for the current single-maintainer workflow;
- squash is the only allowed merge method;
- branches must be up to date;
- required GitHub Actions checks are `hygiene` and `quality`;
- no bypass actors are configured.

On the observed `main` commit, required quality/hygiene checks were successful. Native Quality was also successful. Scheduled production anonymous-boundary smoke was successful on 2026-09-16.

## Recent merged hardening

The latest autonomous hardening sequence includes:

- PR #36: canonical Supabase migration baseline and least-privilege grants;
- PR #37: bounded provider retry/pagination reliability;
- PR #38: server-side stale-write rejection for progress/history/settings;
- PR #39: owner-bound reader-settings outbox and eventual delivery;
- PR #40: bounded/validated backup imports;
- PR #41: preserve reader settings/pending settings sync when clearing the library;
- PR #42: stable local/cross-device reader resume after chapter layout.

These changes are merged into `main`; deployment state is tracked separately below.

## Supabase

Project:

```text
gwpgaojsemcfikgynxwv
```

Observed production state:

- project status: `ACTIVE_HEALTHY`;
- PostgreSQL: 17;
- RLS enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`;
- owner-scoped policies remain in place;
- `anon` has no account-table or identity-sequence access;
- authenticated grants are restricted to application-required operations;
- canonical timestamped migration history is represented under `supabase/migrations/`;
- performance advisor returned no lints.

Security advisor returned one warning only:

```text
Leaked Password Protection Disabled
```

That feature is unavailable on the current Supabase plan and is an accepted documented limitation rather than a release blocker. Do not weaken authentication, RLS, account-bound cache isolation, redirect controls, or secret handling as a substitute.

## Synchronization contract

Current implementation now has both client and server protection against stale/cross-account replay.

Progress:

- local-first IndexedDB save;
- owner-bound progress outbox;
- reconnect/boot retry;
- newest local/remote reconciliation by `updated_at`;
- production trigger rejects older/equal updates.

History:

- account-bound local fallback;
- progress flush also upserts history;
- production trigger rejects older/equal `read_at` updates.

Reader settings:

- account-specific localStorage cache;
- owner-bound IndexedDB settings outbox;
- boot/reconnect flush;
- stale/cross-account queue entries discarded;
- returned server row reconciles local cache after an upsert;
- production trigger rejects older/equal `updated_at` updates.

Reader resume now prefers an exact local scroll position where available and falls back to synchronized percentage for remote/cross-device state. Restoration occurs after chapter content layout rather than while the loading skeleton is rendered.

Library mutations intentionally remain remote-first/online-only unless a future workplan decision adds an owner-bound mutation queue.

## Provider/relay state

Provider code uses one bounded retry only for transient network/socket failures or HTTP 502/503/504. It does not retry 429, normal 4xx, authentication/refusal, validation errors, or caller aborts.

MangaDex and ComicK chapter pagination are bounded. Empty/failed provider responses remain explicit failures; production does not substitute mock content.

WeebCentral relay operational state recorded from the Portainer rollout:

- stack: `pachimanga-relay`;
- container: `pachimanga-weebcentral-relay`;
- container observed healthy after update/redeploy;
- existing relay token retained;
- relay remains operation-limited rather than an arbitrary proxy.

## Import hardening

Merged parser safety includes:

- JSON schema-shaped validation and explicit malformed/unsupported-root errors;
- partial-invalid record reporting;
- duplicate suppression and finite progress parsing;
- bounded JSON/Tachiyomi/Tachimanga input sizes;
- bounded gzip expansion;
- ZIP extracted-size verification;
- corrupt/unsupported backup errors rather than silent fallback.

Representative real backup files still need final end-to-end validation before release-candidate status.

## Vercel production state

Current Vercel project:

```text
project: prj_GyTPSiO9QYhLA8KbBsZDj5QNND3s
team:    team_olxGiaGFWp0OqdcoiwuTIVYl
plan:    Hobby
```

Latest verified production deployment:

```text
deployment: dpl_xpxK7S5rG1EVmAoT1jBw6cgVutPv
state:      READY
commit:     626dbb5aea35ea186107fdb923737ed1ef9dfde8
```

Aliases include `pachimanga.frogilab.dev`.

The production deployment is three commits behind the observed `main` commit `2f9f37c...`; PRs #40, #41, and #42 are merged but were not yet represented by a newer READY production deployment at the time of this snapshot.

### Live runtime check

A production fetch of `https://pachimanga.frogilab.dev` resolved to the authentication experience and returned HTTP 200. Observed response headers included:

```text
cache-control: private, no-store
x-matched-path: /auth
```

The production UI stated that an account is required and exposed no guest/demo mode.

The Vercel runtime-error query for the selected recent window returned no runtime errors.

### Current deployment-pipeline defect

A recent preview deployment failed before application build with:

```text
fatal: bad revision ''
```

Current `vercel.json` contains an ignored-build command equivalent to:

```sh
git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" -- src public package.json package-lock.json next.config.ts postcss.config.mjs tsconfig.json vercel.json
```

The command does not guard an empty/unusable `VERCEL_GIT_PREVIOUS_SHA`. The next runtime task is to make the command fail-safe: if comparison SHAs are unavailable, Vercel should continue the build rather than fail before compilation. Normal comparable commits should continue to skip non-runtime-only deployments.

Do not claim PRs #40-#42 are live until a runtime-equivalent descendant reaches production `READY` and passes Production Smoke.

## Remaining manual release blockers

The work that still inherently needs real identities/devices is narrow:

1. fresh-account registration/confirmation/password-reset lifecycle;
2. same-browser Account A/B isolation;
3. same-account two-session/two-device progress/history/settings validation;
4. installed-PWA validation on iPhone/iPad, Android, and desktop Chromium;
5. service-worker update behavior on an actually installed PWA.

Repository/application work can continue without user input, including the Vercel ignored-build repair, live provider smoke where credentials are not required, reader/import regression coverage, browser E2E automation, performance review, and documentation cleanup.

## Exact next task

Repair the Vercel ignored-build command for missing previous SHA, merge through required `hygiene`/`quality`, obtain a READY production deployment for current runtime code, run Production Smoke, and re-check runtime errors.