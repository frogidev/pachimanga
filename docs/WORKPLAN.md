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

- Verified runtime `main`: `a5a008f1a5916240358743abd741cda993062ea4`.
- PR #44, `fix: make Vercel ignored-build comparison fail open`, is merged.
- GitHub ruleset `Protect main` remains active.
- Pull requests, up-to-date branches, resolved review threads, and squash merges are required.
- Force pushes and branch deletion are blocked.
- Required status checks are `hygiene` and `quality`.
- No bypass actors are configured.
- PR #44 passed Repository Hygiene run `35111974840`, Web Quality run `35111974946`, and Native Quality run `35111975250` before merge.
- Web Quality completed unit tests, lint, typecheck, and production build successfully.

### Vercel production

The earlier deployment drift and ignored-build failure are closed.

Verified production deployment:

```text
deployment: dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs
state:      READY
commit:     a5a008f1a5916240358743abd741cda993062ea4
alias:      https://pachimanga.frogilab.dev
```

The repaired ignored-build helper now continues the build when comparison SHAs are missing, unresolvable, or otherwise unsafe to compare. It still ignores valid comparable commits that contain no hosted-runtime changes.

Evidence:

- PR preview `dpl_9hrLo73cW79RDxvGZFt6BukjYv8v` reproduced a missing comparison SHA and continued to a successful build.
- Production `dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs` detected the hosted-runtime change and continued the build.
- Production Smoke workflow run `35096959939`, rerun job `104849686289`, passed after deployment: 9 protected routes and 4 PWA icons plus auth/offline/manifest/service-worker assertions.
- Direct anonymous production access resolves to `/auth` with `Cache-Control: private, no-store`.
- Post-deploy Vercel production `error`/`fatal` logs for the deployment were empty in the inspected window.

See `verification-2026-09-16.md` and `vercel-build-policy.md` for exact evidence.

### Supabase

Production project: `gwpgaojsemcfikgynxwv`.

Most recently verified state:

- project status `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- RLS enabled on all five account tables;
- owner-scoped policies remain in place;
- `anon` has no account-table/identity-sequence access;
- authenticated grants are least-privilege;
- active migration history is canonical and timestamped under `supabase/migrations/`;
- stale writes for progress/history/settings are rejected by newer-only timestamp guards;
- performance advisor is clean;
- leaked-password protection is the only accepted plan-limited security-advisor warning.

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

## 2. Mandatory session-start checklist

Before choosing work:

- [ ] Read `AGENTS.md`.
- [ ] Read this workplan.
- [ ] Read `docs/verification-2026-09-16.md` and verify live state instead of assuming it is still current.
- [ ] Load the most specific `.hermes/skills/**/SKILL.md` for the task.
- [ ] Check current `main` HEAD, open PRs, and open issues.
- [ ] Check latest Vercel production deployment whenever hosted runtime is in scope.
- [ ] Check Supabase migrations/RLS/advisors whenever auth/data behavior is in scope.
- [ ] Check relay health when provider/relay behavior is in scope.
- [ ] Confirm native distribution is still deferred unless explicitly reprioritized.

Default git model: start from current `main`, create one focused branch, complete one coherent workstream, validate, open one PR, merge only after required checks, verify production for runtime changes, and retire the branch when tooling permits.

---

# P0 — Remaining release blockers

## Phase A — Vercel deployment gating

Completed 2026-09-16.

Evidence is recorded in `docs/verification-2026-09-16.md`. Do not reopen unless live deployment behavior regresses.

## Phase B — Production authentication/account-isolation E2E

This requires real test identities or user-operated sessions and remains a manual release blocker.

- [ ] registration;
- [ ] email confirmation when enabled;
- [ ] sign out/sign back in;
- [ ] password reset/recovery and new-password login;
- [ ] anonymous route matrix confirmation with a real browser session where useful;
- [ ] Account A -> sign out -> Account B in the same browser profile with no A library/history/progress/settings leakage;
- [ ] switch back to A and confirm A state returns while B state does not;
- [ ] same-account two-browser/two-device progress/history/settings synchronization;
- [ ] near-simultaneous updates to observe timestamp/clock-skew behavior.

Do not fabricate completion. Do not weaken authentication, RLS, cache isolation, redirects, or secret handling to make these pass.

## Phase C — Installed-PWA/device matrix

This requires real devices/browser installs.

- [ ] iPhone Safari Add to Home Screen and standalone behavior;
- [ ] iPad Safari standalone behavior;
- [ ] Android Chrome install and standalone behavior;
- [ ] Desktop Chromium install and standalone behavior;
- [ ] safe-area/navigation behavior in standalone mode;
- [ ] service-worker update from an older installed version;
- [ ] offline navigation reaches `/offline` without reusing authenticated HTML as a public shell;
- [ ] auth/session behavior remains correct after an installed-PWA update.

---

# P1 — Remaining autonomous hardening

## Phase D — Provider live smoke and failure behavior

This is the next autonomous runtime-evidence priority.

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

For WeebCentral also verify relay `/health`, authenticated `/health/upstream` where credentials are available without exposing secrets, invalid-operation/ID rejection, and no arbitrary destination input.

Do not require private user credentials for merge-critical provider tests.

## Phase E — Reader release matrix

Automated coverage protects resume calculations and auto-scroll basics; finish the automatable product matrix while leaving real cross-device proof open:

- [ ] conventional manga first/middle/last-page behavior;
- [ ] long-strip/manhwa width and gap behavior;
- [ ] progress save/reload/resume in controlled browser tests;
- [ ] auto-scroll play/pause/speed/manual-interrupt/reduced-motion behavior;
- [ ] bounded preload and broken-image recovery;
- [ ] keyboard/touch/fullscreen accessibility.

Real second-session/device synchronization remains under Phase B.

## Phase F — Import representative-file validation

Parser safety is substantially hardened.

Autonomous work:

- [ ] expand deterministic fixtures/regressions for malformed/corrupt variants and duplicate handling without private production-derived files;
- [ ] validate account ownership boundaries in controlled test data where practical.

Manual/representative evidence still needed before release candidate:

- [ ] OCR/image import and review;
- [ ] `.tachibk` happy path;
- [ ] `.proto.gz` happy path;
- [ ] `.tmb` happy path.

Do not commit private backup data as test fixtures.

## Phase G — Browser E2E automation

Add a maintainable browser-level regression layer, preferably Playwright unless repository constraints show a better option.

Minimum automated scope:

- [ ] anonymous protected-route redirect/auth experience;
- [ ] 360px and desktop shell smoke;
- [ ] core Library/Browse/detail/reader navigation using controlled/stubbed data where needed;
- [ ] no horizontal overflow on core routes;
- [ ] logout/cache-isolation behavior where practical;
- [ ] authenticated test flow only if credentials can be managed safely without production-user secrets.

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
- [ ] Same-browser two-account isolation verified.
- [ ] Real same-account two-session synchronization verified.
- [x] Anonymous production route boundary has automated smoke coverage and passed after the current deployment.
- [x] RLS and least-privilege grants verified.
- [x] Supabase migration provenance reconciled.
- [x] No browser-visible service-role or public relay secret variables.

## Core product

- [ ] Live provider happy/error paths verified.
- [ ] Conventional reader verified.
- [ ] Long-strip reader verified.
- [ ] Representative supported import formats verified.

## PWA

- [ ] iOS/iPadOS install/standalone verified.
- [ ] Android install/standalone verified.
- [ ] Desktop install/standalone verified.
- [ ] Service-worker update behavior verified on an installed PWA.
- [x] Credential-free manifest/icon/offline/service-worker smoke coverage exists and passed after the current production deployment.

## Quality/operations

- [x] Required GitHub merge protection active.
- [x] `hygiene` and `quality` are required checks.
- [x] Vercel production `READY` for runtime commit `a5a008f1a5916240358743abd741cda993062ea4`.
- [x] Production Smoke passed after deployment `dpl_E81ypeQLpisZ3KLtbd2xPwBiReLs`.
- [x] Post-deploy runtime-error/fatal review was clean in the inspected window.
- [x] Vercel ignored-build missing-SHA behavior has regression coverage and live preview evidence.
- [x] No open P0 GitHub issue was present at the latest verification point.
- [x] Deployment-repair evidence is recorded in project documentation.

When the remaining core/manual gate is met, record the exact final commit/deployment and freeze unrelated feature expansion until the platform decision is made.

---

# Final phase — Native/platform distribution

Do not start native distribution in parallel with unfinished PWA release-candidate work.

Native distribution remains deferred and manual-only until explicitly reprioritized after the PWA gate.

---

# Exact next execution order

Unless a new production incident appears:

1. complete provider/relay live smoke that does not require private user credentials;
2. expand reader/import release validation that can run deterministically;
3. add browser E2E coverage;
4. finish performance/observability/cleanup work;
5. complete real-account auth/account-isolation/two-device sync with user-operated test identities;
6. complete installed-PWA device matrix;
7. run the PWA release-candidate gate;
8. only then begin native/platform distribution.

If a P0 production bug is discovered, fix it before lower-priority polish.

# Session closeout template

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
