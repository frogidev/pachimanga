# Pachimanga execution workplan

This is the operational backlog and release plan. It is the primary handoff document for a new ChatGPT/Hermes session and should describe current state rather than preserve completed checklist noise.

Always verify time-sensitive GitHub, Vercel, Supabase, and relay state before acting on recorded status.

## 0. Delivery policy

PWA/web is the only active delivery target until the PWA release-candidate gate is complete.

Production contract:

- Production URL: `https://pachimanga.frogilab.dev`
- Vercel Git integration deploys hosted-runtime changes from `main`.
- Supabase authentication is mandatory; there is no guest/demo reader mode.
- Library, history, progress, settings, imports, and browser-local cache are account-scoped.
- Browser/PWA WeebCentral traffic uses the operation-limited private relay when configured.
- Tauri/native source remains maintained, but Android/desktop/iOS distribution stays deferred and manual-only.

A release-ready claim requires verified production evidence, not only merged code or green CI.

## 1. Current verified state — 2026-09-16

### Repository and CI

- `main`: `2f9f37c4647c8312e114962b4918e4181f8b99ac`.
- No open pull requests were present at the latest status check.
- No open GitHub issues were present at the latest status check.
- GitHub ruleset `Protect main` is active for the default branch.
- Normal changes require a pull request.
- Force pushes and branch deletion are blocked.
- Review conversations must be resolved.
- Squash is the only allowed merge method.
- Required status checks are `hygiene` and `quality` and branches must be current before merge.
- No bypass actors are configured.
- `Repository Hygiene`, Web Quality, Native Quality, and the production anonymous-boundary smoke were green on the current `main` status check.

### Supabase

Production project: `gwpgaojsemcfikgynxwv`.

Verified state:

- project status `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- RLS enabled on all five account tables;
- owner-scoped policies remain in place;
- `anon` has no account-table/identity-sequence access;
- authenticated grants are least-privilege;
- active migration history is canonical and timestamped under `supabase/migrations/`;
- stale writes for progress/history/settings are rejected by newer-only timestamp guards;
- performance advisor is clean;
- the only security-advisor warning is leaked-password protection, which is unavailable on the current Supabase plan and is accepted as a documented plan limitation.

Migration provenance issue #26 is resolved. Do not restore legacy `001`/`002`/`003` SQL into the active migration chain.

### Synchronization and reader state

Merged hardening includes:

- owner-bound progress and reader-settings outboxes;
- cross-account/legacy queue entries are discarded rather than replayed under another account;
- reconnect/boot flushing for durable progress/settings delivery;
- server-side newer-only conflict semantics for progress/history/settings;
- library/history account-bound local fallbacks;
- reader resume prefers exact local pixel position and falls back to synchronized percentage for cross-device state;
- reader resume is restored after chapter layout rather than while the loading skeleton is present;
- clearing the library preserves reader settings and their pending sync state.

### Providers and imports

Merged hardening includes:

- one bounded retry for transient provider network/socket failures and HTTP 502/503/504;
- no retry for 429, normal 4xx, auth/refusal, validation errors, or caller aborts;
- bounded MangaDex and ComicK chapter pagination;
- explicit provider failure instead of mock fallback;
- hardened JSON/Tachiyomi/Mihon/Tachimanga import parsing, size bounds, malformed-input handling, and duplicate filtering.

The WeebCentral Portainer stack was redeployed and the relay container was observed healthy. The relay remains operation-limited and token-protected.

### Current Vercel deployment gap

This is the highest-priority technical blocker.

The latest verified production deployment is:

- deployment: `dpl_xpxK7S5rG1EVmAoT1jBw6cgVutPv`;
- state: `READY`;
- production commit: `626dbb5aea35ea186107fdb923737ed1ef9dfde8`.

Current `main` is three commits ahead of that deployed commit. The missing runtime-equivalent changes are the merged work from PRs #40, #41, and #42.

The live site itself is responding normally and the latest runtime-error query found no production runtime errors in the selected 24-hour window. Anonymous production `/auth` returned HTTP 200 with the required account-only UI and `Cache-Control: private, no-store`.

A recent Vercel preview failed before building with:

```text
fatal: bad revision ''
```

The current `vercel.json` `ignoreCommand` directly diffs `VERCEL_GIT_PREVIOUS_SHA` against `VERCEL_GIT_COMMIT_SHA` and does not guard the case where the previous SHA is empty. Treat this as the leading deployment-pipeline cause until fixed and verified.

See `verification-2026-09-16.md` and `vercel-build-policy.md`.

## 2. Mandatory session-start checklist

Before choosing work:

- [ ] Read `AGENTS.md`.
- [ ] Read this workplan.
- [ ] Read `docs/verification-2026-09-16.md` and then verify live state instead of assuming it is still current.
- [ ] Load the most specific `.hermes/skills/**/SKILL.md` for the task.
- [ ] Check current `main` HEAD, open PRs, and open issues.
- [ ] Check the active branch/working tree and preserve unrelated work.
- [ ] Check latest Vercel production deployment whenever hosted runtime is in scope.
- [ ] Check Supabase migrations/RLS/advisors whenever auth/data behavior is in scope.
- [ ] Confirm native distribution is still deferred unless explicitly reprioritized.

Default git model:

1. start from current `main`;
2. create one focused branch;
3. complete one coherent workstream;
4. validate;
5. open one PR;
6. merge promptly when required checks pass;
7. verify production when runtime changed;
8. retire the branch when tooling permits.

Do not create parallel branches for fragments of the same task.

---

# P0 — Release blockers

## Phase A — Repair Vercel deployment gating and deploy current `main`

### Goal

Restore reliable automatic production deployment for runtime changes and eliminate the three-commit production drift.

### Tasks

- [ ] Reproduce/confirm the empty-`VERCEL_GIT_PREVIOUS_SHA` failure from Vercel build logs.
- [ ] Change `vercel.json` so the ignored-build command safely continues the build when either Git SHA needed for comparison is missing or unusable.
- [ ] Preserve the existing hosted-runtime path allowlist semantics for normal comparable commits.
- [ ] Add a repository regression test for the ignore-command behavior if practical without coupling CI to Vercel internals.
- [ ] Run `npm test`, lint, typecheck, and production build through Web Quality.
- [ ] Merge only after required `hygiene` and `quality` checks pass.
- [ ] Confirm a production deployment for the merged runtime commit reaches `READY`.
- [ ] Run Production Smoke against `https://pachimanga.frogilab.dev`.
- [ ] Confirm anonymous auth boundary and `private, no-store` behavior.
- [ ] Inspect production runtime errors after smoke.
- [ ] Update the dated verification snapshot with the deployed commit and deployment ID.

### Exit criteria

Production runs the intended current `main` runtime, the ignore-command no longer fails on an empty previous SHA, Production Smoke passes, and post-deploy runtime-error inspection is clean or fully explained.

---

## Phase B — Production authentication/account-isolation E2E

This requires real test identities or user-operated sessions and remains the main manual release blocker.

Verify with fresh accounts:

- [ ] registration;
- [ ] email confirmation when enabled;
- [ ] sign out/sign back in;
- [ ] password reset/recovery and new-password login;
- [ ] anonymous route matrix for Library/Browse/Import/History/Settings/manga/reader/source APIs;
- [ ] Account A -> sign out -> Account B in the same browser profile with no A library/history/progress/settings leakage;
- [ ] switch back to A and confirm A state returns while B state does not;
- [ ] same-account two-browser/two-device progress/history/settings synchronization;
- [ ] near-simultaneous updates to observe timestamp/clock-skew behavior.

Supabase leaked-password protection is not a blocker on the current plan. Do not upgrade the plan solely for that advisor warning.

### Exit criteria

No auth bypass or cross-account leak; registration/login/logout/reset work in production; same-account synchronization is demonstrated with real identities.

---

## Phase C — Installed-PWA/device matrix

This requires real devices/browser installs.

- [ ] iPhone Safari Add to Home Screen and standalone behavior.
- [ ] iPad Safari standalone behavior.
- [ ] Android Chrome install and standalone behavior.
- [ ] Desktop Chromium install and standalone behavior.
- [ ] safe-area/navigation behavior in standalone mode.
- [ ] service-worker update from an older installed version.
- [ ] offline navigation reaches `/offline` without reusing authenticated HTML as a public shell.
- [ ] auth/session behavior remains correct after an installed-PWA update.

### Exit criteria

Install/update/offline behavior is repeatable on the intended browser/device set with no account-data caching regression.

---

# P1 — Remaining autonomous hardening

## Phase D — Provider live smoke and failure behavior

The code-level reliability work is merged; complete live application evidence.

For MangaDex, ComicK, and WeebCentral where available:

- [ ] search a known title;
- [ ] open detail/metadata;
- [ ] load chapter list;
- [ ] open reader pages;
- [ ] verify image loading;
- [ ] verify no-result state;
- [ ] verify explicit upstream failure behavior;
- [ ] confirm 403/429 are not hidden by retries;
- [ ] confirm no mock fallback appears in production.

For WeebCentral also verify relay `/health`, authenticated `/health/upstream`, invalid-operation/ID rejection, and no arbitrary destination input.

## Phase E — Reader release matrix

Automated coverage now protects resume calculations and auto-scroll basics, but finish the full product matrix:

- [ ] conventional manga first/middle/last-page behavior;
- [ ] long-strip/manhwa width and gap behavior;
- [ ] progress save/reload/resume;
- [ ] cross-device percentage resume with a real second session;
- [ ] auto-scroll play/pause/speed/manual-interrupt/reduced-motion behavior;
- [ ] bounded preload and broken-image recovery;
- [ ] keyboard/touch/fullscreen accessibility.

## Phase F — Import representative-file validation

Parser safety is substantially hardened. Remaining evidence should use representative real files:

- [ ] OCR/image import and review;
- [ ] `.tachibk` happy path;
- [ ] `.proto.gz` happy path;
- [ ] `.tmb` happy path;
- [ ] malformed/corrupt variants;
- [ ] duplicate handling;
- [ ] account ownership after import.

Do not use production-derived private backup data as committed test fixtures.

## Phase G — Browser E2E automation

Add a maintainable browser-level regression layer, preferably Playwright unless repository constraints show a better option.

Minimum automated scope:

- [ ] anonymous protected-route redirect/auth experience;
- [ ] 360px and desktop shell smoke;
- [ ] core Library/Browse/detail/reader navigation using controlled/stubbed data where needed;
- [ ] no horizontal overflow on core routes;
- [ ] logout/cache-isolation behavior where practical;
- [ ] dedicated authenticated test flow only if credentials can be managed safely without production-user secrets.

CI must not depend on unstable live manga providers for merge-critical tests.

## Phase H — Performance, observability, and cleanup

- [ ] review client bundles/routes after lazy-loading OCR/Tachiyomi/Tachimanga engines;
- [ ] confirm heavy import engines do not load on unrelated routes;
- [ ] review large chapter-list and long-strip reader memory behavior;
- [ ] review service-worker cache growth/eviction assumptions;
- [ ] standardize post-deploy runtime-error review;
- [ ] keep relay logs free of bearer tokens;
- [ ] remove obsolete demo/mock runtime paths only after production behavior is stable;
- [ ] keep documentation synchronized with each material runtime/deployment change.

---

# Release-candidate gate — PWA

Pachimanga may be called a PWA release candidate only when all of the following are true.

## Security/account

- [ ] Production auth lifecycle verified with a fresh account.
- [ ] Anonymous route matrix verified.
- [ ] Same-browser two-account isolation verified.
- [x] RLS and least-privilege grants verified.
- [x] Supabase migration provenance reconciled.
- [x] No browser-visible service-role or public relay secret variables.

## Core product

- [ ] Live provider happy/error paths verified.
- [ ] Conventional reader verified.
- [ ] Long-strip reader verified.
- [ ] Real two-session progress/history/settings sync verified.
- [ ] Representative supported import formats verified.

## PWA

- [ ] iOS/iPadOS install/standalone verified.
- [ ] Android install/standalone verified.
- [ ] Desktop install/standalone verified.
- [ ] Service-worker update behavior verified.
- [x] Credential-free manifest/icon/offline/service-worker smoke coverage exists.

## Quality/operations

- [x] Required GitHub merge protection active.
- [x] `hygiene` and `quality` are required checks.
- [x] Current `main` quality checks are green at the latest verification point.
- [ ] Vercel production `READY` for the intended current runtime commit.
- [ ] Production Smoke passes after that deployment.
- [ ] Post-deploy runtime-error/fatal review clean or explained.
- [x] No open P0 GitHub issue at the latest verification point.
- [ ] Documentation matches the final deployed runtime after the Vercel repair.

When this gate is met, record the exact commit/deployment and freeze unrelated feature expansion until the final platform decision is made.

---

# Final phase — Native/platform distribution

Do not start native distribution in parallel with unfinished PWA P0 work.

Native work remains:

1. re-audit Tauri capabilities/origin/network bridge against the PWA release-candidate code;
2. validate Android signing/install/upgrade and decide direct APK vs Play distribution;
3. validate Windows/Linux packaging and decide macOS native vs PWA-only;
4. decide whether native iOS is needed beyond the PWA and, if so, validate signing/TestFlight;
5. publish/tag deliberately with artifact/signing evidence.

Native artifact/release workflows must remain manual-only until an explicit product decision changes this policy.

---

# Exact next execution order

Unless a new production incident appears:

1. fix the Vercel empty-previous-SHA ignored-build failure;
2. deploy current `main` and run production smoke/log verification;
3. continue live provider/reader/import evidence that can be completed without private user credentials;
4. add browser E2E coverage and finish performance/cleanup work;
5. complete real-account auth/account-isolation/two-device sync with user-operated test identities;
6. complete installed-PWA device matrix;
7. run the PWA release-candidate gate;
8. only then begin native/platform distribution.

If a P0 production bug is discovered, fix it before lower-priority polish.

# Session closeout template

At the end of every substantive session record:

```text
Date:
Branch / PR:
Main HEAD observed:
Production deployment observed:
Workplan item(s) completed:
Files / behavior changed:
Checks actually run/observed:
Production smoke performed:
Known blockers / risks:
Exact next task:
```

Do not mark a release-critical checkbox complete without evidence appropriate to the item.