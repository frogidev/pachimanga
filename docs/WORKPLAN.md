# Pachimanga execution workplan

This is the current operational backlog. Historical evidence lives in the dated verification files; do not preserve completed checklist noise here.

## Delivery policy

PWA/web v1.0.2 is the current released line and remains the active delivery target. Native source stays compatible, but native packaging/signing/store distribution remains a separate manual-only phase that requires explicit user direction.

Production URL: `https://pachimanga.frogilab.dev`

### Current execution state — 2026-09-20

- PR #85 is merged into `main` as `c48a057b30861b93124020822561eea7f7a9f8f4`.
- Repository Hygiene, Web Quality, Native Quality, and Vercel preview validation passed on the final PR head.
- Vercel production deployment `dpl_2MvvLYSXBf3u9hjdAULZfXDSFBb2` is `READY` for the PR #85 runtime.
- The owner reported the requested local validation, Supabase migration push, and post-deploy Production Smoke passed.
- Production migration history includes `20260919234900_tracker_links.sql` and `20260919235000_source_migration_rpc.sql`.
- Post-migration performance advisor has no findings; the known leaked-password-protection security warning remains.
- Use the normal protected PR/check flow for future work. Do not weaken protections if a platform signal becomes unavailable.

## Current release state — 2026-09-20

Pachimanga v1.0.2 remains the current PWA/web release line. The current post-PR85 production checkpoint, deployment evidence, applied migrations, and residual validation limits are maintained in `verification-release-2026-09-20.md`.

Current production runtime:

```text
runtime:    c48a057b30861b93124020822561eea7f7a9f8f4
production: dpl_2MvvLYSXBf3u9hjdAULZfXDSFBb2
state:      READY
alias:      https://pachimanga.frogilab.dev
```

Historical release evidence remains in `verification-release-2026-09-19.md` and `verification-release-2026-09-18.md`; do not rewrite those records.

## Post-release operating priority

Real user feedback is now the primary source of improvements. Prioritize reproducible defects, confusing/high-friction flows, performance/reliability problems, accessibility issues, and responsive/theme regressions before speculative feature expansion.

Default execution is autonomous: when feedback is clear and the fix is safe, inspect, reproduce, implement, cover, validate, and prepare/merge the coherent batch without asking for routine implementation choices. Ask only for genuinely ambiguous product decisions, destructive/security-sensitive actions, credentials/secrets, production data/schema mutation without prior authorization, or native-distribution scope.

Batch related feedback to minimize Vercel deployments. Keep responses concise. When owner-side local verification is needed, provide exact paste-ready PowerShell commands for `F:\LF\pachimanga`.

See `post-release-feedback.md`.

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
- provider refresh coalescing, short freshness reuse, hard refresh timeout, and bounded parsed WeebCentral chapter caching that avoids Next.js >2 MB raw-response cache failures;
- account-owned collections/tags, export/import round-trip restore, provider-result deduplication, richer reading statistics, logical-device clock hardening, owner-bound library mutation outbox, quota-aware/cancellable offline chapter saves, privacy-safe Web Vitals telemetry, and chapter publication dates;
- warm-paper light theme across core surfaces including readable auth/autofill behavior;
- display name/avatar identity surfaced in desktop/mobile shell navigation with immediate post-save refresh;
- post-release mobile-library feedback hardening: reachable mobile theme switching, a genuine list layout, unclipped/list-safe card actions with reading status moved to manga detail, factual Browse library badges, and manga-detail hydration of synced per-chapter progress;
- mobile layout-toggle follow-up: the Grid/List control is scoped next to the "Your Library" content it changes on phones, with visible labels and immediate preference persistence instead of appearing inert above the unrelated Continue Reading section;
- mobile library-control follow-up: sort/status controls now live with "Your Library" on phones, status uses a compact selector instead of an off-screen horizontal pill rail, collection management is hidden on phone widths, and Continue Reading no longer exposes a sort action that actually targeted the lower Library list;
- post-release mobile/theme audit follow-up: manga detail uses an explicit warm-paper hero surface in light mode, and intra-reader chapter changes replace rather than push browser history so Android/browser Back does not replay chapter hops;
- post-release parity batch: explicit fail-closed source migration/duplicate consolidation, account-scoped Library/Browse/manga-detail state retention, per-title manga/webtoon reader presets and configurable preload depth, account-bound offline chapter management, bounded provider concurrency, optional AniList/MyAnimeList tracking with device-local OAuth tokens, and backward-compatible versioned account backup/restore including non-secret tracker links;
- reader follow-up: fully read titles stay caught up instead of restarting at chapter 1; rereading a completed chapter preserves completion and starts at the top; completing the latest unread chapter returns to manga detail.

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

## Post-release manual validation backlog

The v1.0.2 release decision does not fabricate these observations. They remain recommended post-release validation/regression evidence using real identities/devices.

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
- Native/platform distribution is not automatically enabled by the PWA release. It remains manual-only and requires explicit user direction plus the native security/signing/device gates.

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

## Release decision and residual evidence

Pachimanga v1.0.2 is the current released PWA/web line; the latest verified production checkpoint is the PR #85 runtime recorded on 2026-09-20.

Verified/implemented release facts:

- [x] autonomous pre-human-testing hardening is implemented;
- [x] production-data surfaces use truthful loading/error/zero states;
- [x] RLS/least-privilege/account-bound cache architecture is in place;
- [x] service-worker authenticated caching boundary is protected;
- [x] no production mock fallback is registered;
- [x] Supabase collections/profile/clear-library migration is applied;
- [x] final local tests/lint/typecheck/build were reported passing by the operator;
- [x] final exact-head Vercel preview reached `READY`;
- [x] exact release runtime production deployment reached `READY`;
- [x] inspected production error/fatal logs were empty.

Not claimed as completed:

- [ ] full live signed-in production-data matrix;
- [ ] full real auth/account isolation matrix;
- [ ] two-session/two-device sync matrix;
- [ ] installed-PWA device matrix;
- [ ] conventional + long-strip physical-device reader matrix;
- [ ] representative supported import-format matrix;
- [x] post-PR85 credential-free Production Smoke was reported passing by the repository owner after production deployment.

These unchecked items remain post-release evidence/backlog rather than being retroactively marked complete.

## Later backlog after release

Still deferred or externally blocked:

- Web Push chapter delivery: browser subscription/service-worker work is possible, but a real sender requires VAPID key material and a server delivery path; do not expose a notification toggle that cannot actually deliver.
- full append-only reading-event analytics/streaks: current synchronized history intentionally represents latest activity per title; richer statistics now use existing progress data without silently changing that data model.
- broader accessibility browser automation remains optional while the project intentionally avoids adding Playwright to normal dependencies.
- eventual native distribution remains deferred until explicitly requested and the native security/signing/device validation gates are satisfied.

## Exact next task

Treat v1.0.2 as the production baseline. Apply real user feedback as focused post-release improvements. Do not expand features merely to accumulate work.

Next work should be one of:

1. execute the remaining real-account/device/import post-release matrix and record evidence;
2. fix concrete defects found during production use;
3. perform explicitly requested provider/relay maintenance;
4. begin native distribution only after a separate explicit user request and a fresh native release audit.

For any runtime fix, use one focused branch, the full local quality gate, one exact-head Vercel preview when practical, normal protected merge, exact production `READY`, Production Smoke when network access permits, and post-deploy error/fatal inspection.
