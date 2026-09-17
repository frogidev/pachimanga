# Pachimanga execution workplan

This is the current operational backlog. Historical evidence lives in the dated verification files; do not preserve completed checklist noise here.

## Delivery policy

PWA/web remains the only active delivery target until the PWA release-candidate gate is satisfied. Native source stays compatible, but native packaging/signing/store distribution remains deferred and manual-only.

Production URL: `https://pachimanga.frogilab.dev`

## Current verified state — 2026-09-17

Repository/runtime:

```text
main:       dcc14856863ee3ab7a9877e5c7cd9bf953582c95
production: dpl_34FBFiKQBGwfYNNRedyo2ggCFB2Q
state:      READY
runtime:    dcc14856863ee3ab7a9877e5c7cd9bf953582c95
```

PR #62 corrected a release-gate truthfulness issue discovered during manual review: `/updates` had been a static decorative empty screen. Production now exposes live signed-in account/provider availability instead of that placeholder, and Browse/History/Library distinguish loading, confirmed-zero, and failure states rather than using decorative empty-state cards. Missing provider covers remain visibly missing instead of receiving synthesized mock cover art.

Validation observed for PR #62:

- required Repository Hygiene: success;
- required Web Quality: success, including install, unit tests, lint, typecheck, and production build;
- PR Production Smoke: success against the anonymous production boundary;
- production build for the exact squash merge: successful and deployed READY;
- Vercel-side `/auth`: expected sign-in content with `private, no-store`;
- post-deploy production `error`/`fatal` inspection: no matching logs in the inspected window.

A fresh direct post-deploy `node ops/production-smoke.mjs` run was attempted from the current agent container, but DNS resolution for the production host failed with `EAI_AGAIN` before assertions ran. Do not count that attempt as a pass. Rerun from a network-capable environment before release-candidate status.

See `verification-2026-09-17.md`, `verification-pr58-2026-09-17.md`, `verification-pr60-2026-09-17.md`, and `verification-pr62-2026-09-17.md` for exact evidence.

## Completed autonomous hardening

Implemented and merged:

- Vercel ignored-build missing/unresolvable SHA fail-open behavior;
- provider retry/pagination and explicit failure behavior;
- ComicK excluded as a validated new-reader fallback while its public chapter-list API returns `403`;
- separate personal reading status versus provider publication status;
- dynamic manga progress and deterministic large-account rehydration;
- compact account-bound library progress summary RPC;
- owner-bound progress/settings outboxes, visible sync state, `Sync now`, and retry controls;
- Continue Reading, Unread Updates, Recently Updated, Library sorting;
- PWA explicit update lifecycle, installed-mode handling, bounded runtime cache, and account-bound offline chapter downloads;
- reader navigation/progress/Wake Lock/long-strip hardening;
- heavy-import lazy-load/performance guards and optional browser E2E runner;
- privacy-safe Settings diagnostics and Copy diagnostics;
- typed provider/offline/network/`403`/`429`/relay/missing-content error UX with safe Retry;
- signed-in allowlisted JSON account export without credentials/session/provider secrets;
- per-title manual chapter refresh with last-checked information;
- final accessibility/UI-state hardening for focus, accessible labels/status, Escape behavior, reduced motion, and 320/360/390/768/1280 layout checks;
- live-data truthfulness hardening: `/updates` now shows real account/provider availability, Browse/History/Library use explicit real loading/zero/error states, and production cards no longer synthesize missing cover art.

## Production-data truthfulness contract

Do not reintroduce decorative or static states that imply a live query has completed when it has not.

Required behavior:

- loading must be visually distinct from zero results;
- data-source failure must be visually distinct from an empty account or zero provider matches;
- confirmed zero states may remain, but must state what live/local source returned zero data;
- provider `403`/`429`, relay unavailable, offline/network failure, missing content, and generic upstream errors remain explicit;
- no production demo/mock content or synthesized provider availability;
- missing provider cover/metadata stays visibly missing rather than becoming fabricated content;
- Updates may check stale source-backed titles on page open using the bounded freshness policy and may offer deliberate manual checking, but must not add aggressive background polling.

## P0 — Manual release evidence

Requires real identities/devices; do not fabricate completion.

### Authentication/account isolation

- [ ] fresh registration;
- [ ] email confirmation when enabled;
- [ ] logout/login;
- [ ] password reset/recovery and new-password login;
- [ ] Account A -> logout -> Account B in one browser profile with no A library/history/progress/settings/offline-download leakage;
- [ ] return to A and confirm A state returns without B state;
- [ ] same-account two-browser/two-device sync for progress/history/settings;
- [ ] near-simultaneous update/clock-skew behavior.

### Live production-data matrix

Using a real signed-in disposable/test account, verify that production reflects actual data rather than placeholders:

- [ ] `/updates` loads real account title counts and source-backed/local counts;
- [ ] a source-backed title shows its real chapter count and last-checked state;
- [ ] `Check all now` updates last-checked/provider state without aggressive polling;
- [ ] a genuine zero-update result is shown only after successful checking;
- [ ] provider/offline failure is shown as failure, not as zero updates;
- [ ] Browse shows searching, real results, confirmed zero results, and explicit failure separately;
- [ ] History shows actual stored events or a confirmed zero-event state;
- [ ] Library shows actual account rows or a confirmed zero-title state;
- [ ] missing cover/metadata is visibly missing and no synthetic manga content appears.

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

- [ ] rerun `node ops/production-smoke.mjs` against `https://pachimanga.frogilab.dev` from a network-capable environment on runtime `dcc14856863ee3ab7a9877e5c7cd9bf953582c95` or its proven runtime-equivalent descendant.

## Provider release evidence

- MangaDex has prior verified live search/detail/chapter/page/image evidence.
- WeebCentral public relay health has prior evidence; authenticated upstream health requires authorized operator context. Recheck authoritative relay health for any provider/relay change.
- ComicK metadata search works through `api.comick.dev`, but its public chapter-list path has returned `403`; do not advertise ComicK as a validated reader source until a stable readable chain exists.
- Never bypass `403`/`429`, CAPTCHAs, auth, or anti-bot controls.

## Platform/security state

- GitHub `main` remains protected by the active `Protect main` ruleset: PR required, strict up-to-date `hygiene` and `quality`, review-thread resolution, squash merge only, no bypass actor.
- Supabase production project `gwpgaojsemcfikgynxwv` has RLS enabled on all account-owned tables and owner-scoped policies. Latest recorded performance advisor is clean; the known leaked-password-protection warning remains plan-limited.
- No native/platform release work is permitted until the PWA release-candidate gate below is complete.

## Quality gate

From an updated local clone or equivalent trusted execution environment:

```powershell
npm ci
npm run verify
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

For runtime-impacting changes additionally require Vercel build evidence when available, exact production READY verification after merge, and recent production `error`/`fatal` log inspection.

The optional `ops/browser-e2e.mjs` may be used only where Playwright + Chromium already exist. Do not add Playwright to normal project dependencies merely to run this optional evidence.

## Release-candidate gate

Pachimanga may be called a PWA release candidate only when:

- [x] autonomous pre-human-testing hardening is implemented;
- [x] production-data surfaces no longer use misleading static/decorative empty states for live availability;
- [ ] live production-data matrix above passes with a real signed-in account;
- [ ] full real auth/account isolation evidence is complete;
- [ ] two-session/two-device sync evidence is complete;
- [ ] installed-PWA device matrix is complete;
- [ ] conventional + long-strip reader matrix is complete;
- [ ] representative supported import formats are validated;
- [ ] fresh credential-free production smoke passes on the current runtime;
- [x] current production runtime deployment is `READY`;
- [x] RLS/least-privilege/account-bound cache architecture is in place;
- [x] service-worker authenticated caching boundary is protected;
- [x] no production mock fallback is registered.

When this gate is satisfied, record exact final commit/deployment/evidence. Native/platform distribution remains blocked until then.

## Later backlog after human testing begins

Prioritize only from observed user feedback and measured performance. Candidate future work includes Web Push chapter notifications, collections/tags, richer history/statistics, provider-result deduplication, export/import round-trip restore, advanced offline download management, logical-device conflict clocks, library mutation offline queueing, improved accessibility automation, privacy-safe Web Vitals telemetry, and eventual native distribution.

## Exact next task

Run the manual live production-data/auth/device/import release-candidate matrix with real identities/devices and rerun Production Smoke from a network-capable environment. Freeze unrelated feature expansion and do not begin native/platform release work until the PWA release-candidate gate is complete.
