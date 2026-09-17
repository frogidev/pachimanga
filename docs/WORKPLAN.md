# Pachimanga execution workplan

This is the current operational backlog. Historical evidence lives in the dated verification files; do not preserve completed checklist noise here.

## Delivery policy

PWA/web remains the only active delivery target until the PWA release-candidate gate is satisfied. Native source stays compatible, but native packaging/signing/store distribution remains deferred and manual-only.

Production URL: `https://pachimanga.frogilab.dev`

## Current verified state — 2026-09-17

Repository:

```text
main: 2858d5f1f09e4800fa7fdb97464cf56558f2f27a
```

Latest production runtime deployment:

```text
deployment: dpl_CQuCELMmy2dWPbknbGjjy7iJHbQA
state:      READY
runtime:    2858d5f1f09e4800fa7fdb97464cf56558f2f27a
```

PR #60 completed the final planned autonomous pre-human-testing hardening slice. Its required `hygiene` and `quality` checks passed, the exact-head Vercel preview reached READY, production reached READY for the squash merge above, `/auth` returned the expected signed-out experience with `private, no-store`, and the inspected production error/fatal window was empty.

A fresh production smoke was attempted from the current agent container but its outbound DNS/fetch path failed before assertions ran. Do not record that attempt as a pass. Historical user-operated production smoke evidence remains valid only for the earlier runtime on which it was executed.

See `verification-2026-09-17.md`, `verification-pr58-2026-09-17.md`, and `verification-pr60-2026-09-17.md` for exact evidence.

## Completed autonomous hardening

The following are implemented and should not be reopened without a regression:

- Vercel ignored-build missing/unresolvable SHA fail-open behavior;
- production deployment drift repair;
- provider retries/pagination and explicit failure behavior;
- ComicK discovery exclusion while its public chapter-list path is unreadable;
- library personal-status model separated from publication status;
- dynamic manga progress from synchronized chapter progress;
- deterministic large-progress pagination and logout/login rehydration fix;
- compact account-bound library progress summary RPC;
- owner-bound progress and settings outboxes plus visible sync state;
- chapter-update tracking, Unread Updates, real Recently Updated, Continue Reading;
- PWA explicit update lifecycle and installed-mode handling;
- bounded runtime cache;
- explicit account-bound offline chapter downloads;
- reader navigation/progress/Wake Lock/long-strip containment hardening;
- heavy-import lazy-load regression guards;
- optional browser E2E runner without project Playwright dependency;
- safe Settings diagnostics with Copy diagnostics;
- explicit `Sync now` and retry-pending-sync controls;
- differentiated provider failure UX for offline/network, `403`, `429`, relay unavailable, missing/removed content, and generic upstream errors with safe Retry actions;
- signed-in account JSON export with explicit field allowlists and no credentials/session/provider secrets;
- per-title manual chapter refresh with useful last-checked information and no aggressive polling;
- final PWA accessibility/UI-state hardening: visible focus, keyboard dismissal, reduced-motion guards, accessible status announcements, and the 320/360/390/768/1280 optional browser-check matrix.

## P0 — Pre-human-testing hardening

All six planned autonomous items are complete and merged. Freeze unrelated feature expansion until the manual PWA release-candidate matrix is complete.

- [x] Settings diagnostics panel with Copy diagnostics and privacy-safe app/session/sync/service-worker/storage/provider freshness information.
- [x] Explicit `Sync now` and retry-pending-sync controls for owner-bound progress/settings queues.
- [x] Provider error UX distinguishing offline/network failure, `429`, `403`, relay unavailable, missing/removed chapter, and generic upstream failure with safe Retry actions.
- [x] Signed-in `Export my data` JSON containing allowlisted Library metadata/status, progress, history, and reader settings without credentials/session/provider secrets.
- [x] Final accessibility/UI-state hardening covering keyboard focus, accessible control naming, Escape/dismiss behavior, reduced motion, loading/empty/error review, and 320/360/390/768/1280 layout checks in the optional browser runner.
- [x] Per-title manual chapter refresh plus last-checked information without aggressive provider polling.

## P0 — Manual release evidence

Requires real identities/devices; do not fabricate completion:

### Authentication/account isolation

- [ ] fresh registration;
- [ ] email confirmation when enabled;
- [ ] logout/login;
- [ ] password reset/recovery and new-password login;
- [ ] Account A -> logout -> Account B in one browser profile with no A library/history/progress/settings/offline-download leakage;
- [ ] return to A and confirm A state returns without B state;
- [ ] same-account two-browser/two-device sync for progress/history/settings;
- [ ] near-simultaneous update/clock-skew behavior.

### Installed PWA/device matrix

- [ ] iPhone Safari Add to Home Screen;
- [ ] iPad standalone;
- [ ] Android Chrome install/standalone;
- [ ] desktop Chromium install/standalone;
- [ ] safe areas/back navigation/keyboard viewport behavior;
- [ ] service-worker upgrade from an older installed build;
- [ ] offline navigation and explicit offline chapter reuse;
- [ ] auth/session continuity after PWA update.

### Reader matrix

- [ ] conventional manga first/middle/last behavior;
- [ ] long-strip/manhwa usable width and memory behavior;
- [ ] progress save/reload/resume;
- [ ] auto-scroll play/pause/speed/manual interruption;
- [ ] keyboard/touch controls;
- [ ] broken-image/retry behavior;
- [ ] Wake Lock on supported devices;
- [ ] reduced-motion behavior.

### Representative imports

- [ ] OCR/image review;
- [ ] `.tachibk` happy path;
- [ ] `.proto.gz` happy path;
- [ ] `.tmb` happy path;
- [ ] duplicate/malformed/partial-failure behavior with disposable non-private samples.

### Fresh production boundary evidence

- [ ] rerun `node ops/production-smoke.mjs` against `https://pachimanga.frogilab.dev` from a network-capable environment on the current runtime.

## Provider release evidence

- MangaDex happy chain has live evidence.
- WeebCentral public relay health has prior evidence; the current agent container could not resolve `wc-relay.frogilab.dev`, so no new relay-health pass is claimed for this session. Authenticated upstream health still requires authorized operator context.
- ComicK metadata search works, but the public chapter-list path has returned `403`; do not advertise ComicK as a validated reader source until a stable readable chain exists.
- Do not bypass `403`/`429`, CAPTCHAs, auth, or anti-bot controls.

## Current platform/security state

GitHub `main` is protected by the active `Protect main` ruleset: pull request required, strict up-to-date `hygiene` and `quality` checks, review-thread resolution, squash merge only, and no bypass actor.

Supabase production project `gwpgaojsemcfikgynxwv` was re-inspected during PR #60 closeout:

- migration chain present through `20260917030319 restrict_library_progress_summary_rpc`;
- RLS enabled on all five account-owned tables;
- inspected policies remain authenticated-owner scoped with `auth.uid()` predicates;
- performance advisor clean;
- security advisor still reports only the known leaked-password-protection warning.

## Quality gate while GitHub Actions capacity is constrained

From an updated local clone:

```powershell
npm ci
npm run verify
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

For runtime-impacting changes also require a successful Vercel preview/build, then after merge confirm production `READY` and inspect recent Vercel `error`/`fatal` logs.

The optional `ops/browser-e2e.mjs` may be used only from an environment where Playwright + Chromium already exist. Do not add Playwright to normal project dependencies merely to run this optional evidence.

## Release-candidate gate

Pachimanga may be called a PWA release candidate only when:

- [x] pre-human-testing hardening is complete;
- [ ] full real auth/account isolation evidence is complete;
- [ ] two-session/two-device sync evidence is complete;
- [ ] installed-PWA device matrix is complete;
- [ ] conventional + long-strip reader matrix is complete;
- [ ] representative supported import formats are validated;
- [ ] fresh credential-free production smoke passes on the current runtime;
- [x] production runtime deployment is `READY`;
- [x] RLS/least-privilege/account-bound cache architecture is in place;
- [x] service-worker authenticated caching boundary is protected;
- [x] no production mock fallback is registered.

When this gate is satisfied, record the exact final commit/deployment/evidence. Native/platform distribution remains blocked until then.

## Later backlog after human testing begins

Prioritize only from observed user feedback and measured performance. Candidate future work includes Web Push chapter notifications, collections/tags, richer history/statistics, provider-result deduplication, export/import round-trip backup restore, advanced offline download management, logical-device conflict clocks, library mutation offline queueing, improved accessibility automation, privacy-safe Web Vitals telemetry, and eventual native distribution.

## Exact next task

Run the manual PWA release-candidate matrix above with real identities/devices and rerun the credential-free production smoke from a network-capable environment. Do not begin unrelated feature expansion or native/platform release work until the PWA release-candidate gate is complete.
