# Verification snapshot — 2026-09-17

This is the current dated handoff snapshot for the Pachimanga PWA. Verify live state again before making time-sensitive claims.

## Repository

- Repository: `frogidev/pachimanga`
- Observed `main`: `ef67bc255134ec9bf033846bb8d062131195c715`
- `main` includes PRs #44 through #52, including Vercel fail-open build detection, provider hardening, library-state/progress fixes, compact progress summaries, PWA update lifecycle, reader/offline hardening, and browser/performance guardrails.
- PR #52 is documentation/tests/ops only; it does not change hosted runtime output.
- GitHub Actions capacity is unavailable for the remainder of the current month. Do not depend on Actions for validation and do not weaken security/auth/RLS boundaries to compensate.

## User-operated local quality gate

On Windows PowerShell from `F:\LF\pachimanga`, after updating local `main`, the user ran:

```powershell
npm ci
npm run verify
```

Observed result:

- `npm ci`: 396 packages installed, 0 vulnerabilities;
- unit suite: 94 tests, 94 passed, 0 failed, 0 skipped;
- ESLint: passed;
- TypeScript `tsc --noEmit`: passed;
- Next.js 16.3.3 production build: passed;
- 18/18 static pages generated successfully.

The Windows LF/CRLF messages were Git line-ending warnings only, not quality failures.

The user then ran:

```powershell
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

Observed result:

```text
Production smoke passed for https://pachimanga.frogilab.dev
Protected routes checked: 9
PWA icons checked: 4
```

This is the current replacement evidence for unavailable GitHub Actions quality/smoke execution.

## Vercel production

Latest observed production runtime deployment:

```text
deployment: dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN
state:      READY
commit:     605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6
alias:      https://pachimanga.frogilab.dev
```

That commit is PR #51, `feat: harden reader and account-bound offline chapters`.

`main` is newer because PR #52 changed only tests, operations tooling, and documentation. Vercel correctly did not require a new production runtime build for those non-runtime-only changes. The live service worker still exposes the expected bounded PWA behavior: network-first navigation, `/offline` fallback, API exclusion, runtime cache cap, and dedicated account-bound chapter cache.

Recent Vercel runtime `error`/`fatal` inspection for the production deployment was empty in the inspected window.

## Library/progress state

Implemented and merged:

- separate source publication status and personal reading status;
- personal states: Plan to Read, Reading, Completed, On Hold, Dropped;
- manual override versus automatic progress-derived status;
- dynamic manga percentage from synchronized chapter progress;
- compact account-bound `get_library_progress_summaries()` RPC;
- deterministic paginated fallback for large progress datasets;
- fail-closed reconstruction: incomplete progress snapshots do not overwrite status;
- owner-bound progress/settings outboxes;
- visible sync state;
- Continue Reading, unread-update filter, real Recently Updated ordering, and incremental Library rendering;
- chapter-update baseline/new-count tracking.

The logout/login regression that showed `0% / Plan to Read` for previously completed titles was caused by a one-page Supabase progress fetch. Production data had not been deleted. PR #48 fixed reconstruction with deterministic pagination and incomplete-snapshot protection.

## PWA and Reader

Merged hardening includes:

- explicit service-worker update prompt and user-controlled reload;
- installed-mode detection and safe-area-aware navigation;
- bounded runtime cache;
- explicit account-bound offline chapter page cache;
- clearing/rebinding chapter downloads on account change/sign-out;
- Settings storage estimate and offline-download clearing controls;
- reader progress bar, page navigation controls, chapter selector, keyboard/touch navigation;
- optional Screen Wake Lock;
- bounded preload/lazy behavior and `content-visibility` containment for long chapters;
- optional browser E2E runner that does not install Playwright as a project dependency.

## Providers

- MangaDex live chain was verified through search/detail/chapters/pages/image/no-result during provider hardening.
- WeebCentral relay public health was observed healthy; authenticated upstream health remains dependent on the private relay token/operator context.
- ComicK metadata search uses `api.comick.dev`. Its public chapter-list path was observed returning `403`, so ComicK is intentionally excluded as a new reader-discovery fallback while compatibility code remains for existing/imported identifiers.
- Production source failures remain explicit; no mock fallback is registered.

## Supabase

Production project: `gwpgaojsemcfikgynxwv`.

Current architecture includes:

- RLS on account-owned data;
- least-privilege authenticated grants and no anonymous account-table access;
- canonical timestamped migrations;
- newer-only conflict guards for progress/history/settings;
- library-state tracking migration;
- account-bound compact progress-summary RPC with `SECURITY INVOKER` and no `anon`/`PUBLIC` execute access.

Latest known advisor state: performance clean; leaked-password protection remains the accepted plan-limited security warning.

## Remaining release-candidate evidence

Do not mark these complete without real evidence:

1. fresh-account registration and confirmation;
2. password recovery/new-password login;
3. same-browser Account A -> B -> A isolation;
4. same-account two-session/two-device progress/history/settings synchronization;
5. near-simultaneous update/clock-skew observation;
6. installed PWA on iPhone, iPad, Android, and desktop Chromium;
7. service-worker upgrade from an older installed PWA;
8. offline installed-PWA behavior on physical devices;
9. conventional manga and long-strip/manhwa reader validation on real devices;
10. representative OCR, `.tachibk`, `.proto.gz`, and `.tmb` imports using non-private disposable samples.

## Pre-human-testing product hardening still proposed

These improvements were discussed but are **not yet implemented** as of this snapshot:

- richer Settings diagnostics panel with copyable diagnostics;
- explicit `Sync now` / retry control;
- more specific provider/network/403/429/relay error UX with Retry;
- user data JSON export/backup without secrets;
- final accessibility/focus/keyboard/error-state pass;
- manual per-title chapter refresh + visible last-checked age where useful.

Do not claim these as shipped until code and validation evidence exist.

## Exact next autonomous task

Implement the pre-human-testing hardening above in small PWA-first PRs, validate with the local `npm run verify` workflow and Vercel previews/runtime checks, update this documentation, then freeze feature expansion and move to real-account/device testing.
