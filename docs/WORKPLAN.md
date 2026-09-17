# Pachimanga execution workplan

This is the current operational backlog. Historical evidence lives in the dated verification files; do not preserve completed checklist noise here.

## Delivery policy

PWA/web remains the only active delivery target until the PWA release-candidate gate is satisfied. Native source stays compatible, but native packaging/signing/store distribution remains deferred and manual-only.

Production URL: `https://pachimanga.frogilab.dev`

## Current verified state — 2026-09-17

Repository:

```text
main: ef67bc255134ec9bf033846bb8d062131195c715
```

Latest production runtime deployment:

```text
deployment: dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN
state:      READY
runtime:    605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6
```

`main` is newer only because PR #52 contains tests/ops/docs and is intentionally non-runtime.

User-operated local validation on current `main`:

- `npm ci`: 0 vulnerabilities;
- `npm run verify`: 94/94 tests passed, lint passed, typecheck passed, production build passed;
- production smoke: passed, 9 protected routes and 4 PWA icons.

GitHub Actions capacity is unavailable for the remainder of the current month. Use local `npm run verify`, Vercel preview/build signals, `node ops/production-smoke.mjs`, and Vercel runtime-error inspection. Do not weaken auth, RLS, account isolation, branch safety, or secret handling because Actions is unavailable.

See `verification-2026-09-17.md` for exact evidence.

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
- credential-free production smoke.

## P0 — Pre-human-testing hardening

Implement these before feature freeze:

- [ ] Settings diagnostics panel: app version/current build identifier where available, session/account-safe status, sync/outbox state, service-worker state, offline-storage estimate, provider freshness summary, Copy diagnostics. Never include tokens, passwords, email confirmation links, relay secrets, or raw private content.
- [ ] Explicit `Sync now` and retry control for owner-bound progress/settings queues, with clear success/pending/failure feedback.
- [ ] Provider error UX that distinguishes offline/network failure, rate limit `429`, refusal `403`, relay unavailable, removed/missing chapter, and generic upstream failure; expose safe Retry actions without bypass behavior.
- [ ] Local `Export my data` JSON for the signed-in account: library metadata/status, progress, history, and reader settings only. Exclude session tokens, credentials, relay secrets, service-role data, and provider cookies.
- [ ] Final accessibility pass: keyboard traversal, visible focus, icon-button accessible names, Escape behavior for dismissible surfaces, reduced-motion behavior, loading/empty/error states, and 320/360/390/768/1280 layout checks.
- [ ] Per-title manual chapter refresh and useful `last checked` indication without aggressive polling.

Keep these as small focused PWA/web PRs. No native release work.

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

## Provider release evidence

- MangaDex happy chain has live evidence.
- WeebCentral public relay health has evidence; authenticated upstream health requires authorized operator context.
- ComicK metadata search works, but the public chapter-list path has returned `403`; do not advertise ComicK as a validated reader source until a stable readable chain exists.
- Do not bypass `403`/`429`, CAPTCHAs, auth, or anti-bot controls.

## Quality gate while GitHub Actions is unavailable

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

- [ ] pre-human-testing hardening above is complete;
- [ ] full real auth/account isolation evidence is complete;
- [ ] two-session/two-device sync evidence is complete;
- [ ] installed-PWA device matrix is complete;
- [ ] conventional + long-strip reader matrix is complete;
- [ ] representative supported import formats are validated;
- [x] local full quality gate passes on current code;
- [x] credential-free production smoke passes;
- [x] production runtime deployment is `READY`;
- [x] RLS/least-privilege/account-bound cache architecture is in place;
- [x] service-worker authenticated caching boundary is protected;
- [x] no production mock fallback is registered.

When this gate is satisfied, record exact final commit/deployment/evidence and freeze unrelated feature expansion before deciding whether to start native distribution.

## Later backlog after human testing begins

Prioritize only from observed user feedback and measured performance. Candidate future work includes Web Push chapter notifications, collections/tags, richer history/statistics, provider-result deduplication, export/import round-trip backup restore, advanced offline download management, logical-device conflict clocks, library mutation offline queueing, improved accessibility automation, Web Vitals telemetry that avoids private content, and eventual native distribution.

## Exact next task

Implement the P0 pre-human-testing hardening in focused PRs, update `verification-2026-09-17.md` with exact evidence, then begin the manual auth/device matrix.
