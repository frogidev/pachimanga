# Pachimanga execution workplan

This is the current operational backlog. Historical evidence lives in the dated verification files; do not preserve completed checklist noise here.

## Delivery policy

PWA/web remains the only active delivery target until the PWA release-candidate gate is satisfied. Native source stays compatible, but native packaging/signing/store distribution remains deferred and manual-only.

Production URL: `https://pachimanga.frogilab.dev`

### Temporary execution constraints — remainder of September 2026

- GitHub Actions capacity is unavailable for the remainder of the month. Do not spend pushes trying to obtain CI evidence and do not treat absent/skipped checks as a pass.
- Batch repository changes before pushing. Avoid commit-by-commit remote iteration.
- Minimize Vercel builds: use at most one exact-head preview/build for a completed runtime batch when possible, then one production deployment after an allowed merge.
- Keep the existing ruleset/check requirements intact; do not weaken repository protections as a workaround for quota limits.
- Until Actions capacity returns, merge only with equivalent trustworthy local verification plus final Vercel build evidence when available, or leave the PR open with the missing gate explicit.

## Current verified state — 2026-09-17

Repository/runtime:

\`\`\`text
main:       dcfd284b1416ec7c85a6e00ab5d4e8ba7a9f1f8d
production: dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA
state:      READY
runtime:    c9060fd177b7d3cdf607cbde1945af875e283fa7
\`\`\`

PR #62 corrected the production-data truthfulness issue in Updates/Browse/History/Library. PR #68 subsequently merged the consolidated PWA test branch with account/security UX, sync-status efficiency, reader start-target correction, Settings/navigation cleanup, and provider-refresh performance hardening.

Validation observed for PR #68 final head `0e4fdb5eefd2f870c9e47435ac40ccec9735ff92`:

- Repository Hygiene: success;
- Web Quality: success, including `npm ci`, unit tests, lint, typecheck, and production build;
- Production Smoke: success on the PR gate;
- no open review threads at merge time;
- exact-head Vercel preview attempts were affected by the Hobby build-rate limit, but the merged runtime commit deployed successfully;
- exact production deployment `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` reached `READY` for `c9060fd177b7d3cdf607cbde1945af875e283fa7`;
- production error/fatal log inspection for that deployment returned no matching entries in the inspected post-deploy window.

A fresh post-merge `node ops/production-smoke.mjs` was rerun from GitHub-hosted Ubuntu on 2026-09-17 against this runtime and passed with 12 protected routes and 4 PWA icons checked.

See `verification-2026-09-17.md` and the PR-specific verification records for exact evidence.

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
- Settings-integrated account management with profile personalization, confirmation resend, password recovery, signed-in password change, and safe sign-out;
- `/account` retained only as a protected compatibility redirect to `/settings#account`;
- sign-out placed as the final Settings action and theme moved to a quick shell toggle;
- first-read behavior starts at the earliest available chapter while real progress retains Continue behavior;
- shared visibility-aware sync-status observer with IndexedDB count-only pending queue checks;
- provider refresh coalescing, short freshness reuse, hard refresh timeout, and bounded parsed WeebCentral chapter caching that avoids Next.js >2 MB raw-response cache failures.

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

- [x] reran `node ops/production-smoke.mjs` against `https://pachimanga.frogilab.dev` from GitHub-hosted Ubuntu on 2026-09-17; result: pass, 12 protected routes and 4 PWA icons checked against runtime `c9060fd177b7d3cdf607cbde1945af875e283fa7`.

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
- [x] fresh credential-free production smoke passes on the current runtime;
- [x] current production runtime deployment `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` is `READY` for `c9060fd177b7d3cdf607cbde1945af875e283fa7`;
- [x] RLS/least-privilege/account-bound cache architecture is in place;
- [x] service-worker authenticated caching boundary is protected;
- [x] no production mock fallback is registered.

When this gate is satisfied, record exact final commit/deployment/evidence. Native/platform distribution remains blocked until then.

## Later backlog after human testing begins

PR #72 now carries the autonomous implementations for collections/tags, account-export round-trip restore, provider-result deduplication, richer reading statistics, logical-device clock hardening, library mutation offline queueing, advanced offline download guards, and privacy-safe Web Vitals telemetry. These remain unmerged until the branch gate is satisfied.

Still deferred or externally blocked:

- Web Push chapter delivery: browser subscription/service-worker work is possible, but a real sender requires VAPID key material and a server delivery path; do not expose a notification toggle that cannot actually deliver.
- full append-only reading-event analytics/streaks: current synchronized history intentionally represents latest activity per title; richer statistics now use existing progress data without silently changing that data model.
- broader accessibility browser automation remains optional while the project intentionally avoids adding Playwright to normal dependencies.
- eventual native distribution remains blocked by the PWA release-candidate gate.

## Exact next task

Finish PR #72 as a single batched runtime change without further iterative pushes: perform equivalent local `npm test`, lint, typecheck and build when a trusted checkout is available, then use one final exact-head Vercel preview/build if available. Do not merge merely because GitHub Actions are unavailable. The new Supabase migration must remain unapplied until the runtime batch is ready to merge as one unit. After that, resume the remaining real-account/device/import release-candidate matrix.
