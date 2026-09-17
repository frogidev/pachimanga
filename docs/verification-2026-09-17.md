# Verification snapshot — 2026-09-17

This is the current dated handoff snapshot for the Pachimanga PWA. Verify live state again before making time-sensitive claims.

## Repository

- Repository: `frogidev/pachimanga`
- Observed `main`: `f1fc114aaa63ca508e13ab4914635f3528091ebd`
- `main` includes PRs #44 through #54, including Vercel fail-open build detection, provider hardening, library-state/progress fixes, compact progress summaries, PWA update lifecycle, reader/offline hardening, browser/performance guardrails, and the first pre-human-testing Settings hardening slice.
- PR #54 added privacy-safe Settings diagnostics/Copy diagnostics and explicit owner-bound `Sync now` / pending-sync retry controls.
- GitHub Actions capacity remains constrained for the current month. Do not make planned work depend on Actions and do not weaken security/auth/RLS boundaries to compensate. Fresh required checks did run successfully for PR #54.

## User-operated local quality gate

On Windows PowerShell from `F:\LF\pachimanga`, after updating local `main` before PR #54, the user ran:

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

That smoke result predates PR #54 and remains historical evidence, not a substitute for a fresh smoke after a runtime change.

## PR #54 validation and production

PR #54 (`feat: add safe diagnostics and manual sync controls`) was merged as:

```text
main commit: f1fc114aaa63ca508e13ab4914635f3528091ebd
preview:     dpl_6p7EJeqRbFpTLpQEcH7xCQ64iurC — READY
production:  dpl_8azCQ4n2hBuEzvNBPmXkiHs5a6Wx — READY
alias:       https://pachimanga.frogilab.dev
```

Fresh PR-head validation completed successfully:

- Repository Hygiene run `35239488774`: success;
- Web Quality run `35239488730`: success after one lint-only fix;
- `npm ci`: 0 vulnerabilities;
- unit suite: 94/94 passed;
- ESLint: passed;
- TypeScript typecheck: passed;
- Next.js production build: passed;
- final Vercel preview: READY.

Post-deploy verification:

- exact production deployment `dpl_8azCQ4n2hBuEzvNBPmXkiHs5a6Wx` reached READY for `f1fc114aaa63ca508e13ab4914635f3528091ebd`;
- Vercel-side fetch of `/auth` returned 200 with `cache-control: private, no-store` and the expected `Sign in to Pachimanga` content;
- error/fatal runtime-log inspection scoped to the new production deployment was empty in the inspected post-deploy window.

A fresh execution of `node ops/production-smoke.mjs` was attempted from the current agent container, but the container's outbound fetch/DNS path failed before any route assertions could run. This is **not** recorded as a passing smoke. Do not replace it with fabricated evidence; rerun the script from a network-capable environment when available.

## Production runtime observations

Before PR #54 was deployed, a 24-hour Vercel production inspection found two `/reader/[chapterId].rsc` `fetch failed` events on the prior runtime deployment, latest `2026-09-17T14:22:42Z`, with `write ETIMEDOUT` as the cause. Treat this as provider/network reliability evidence; do not describe the whole day as error-clean.

The PR #54 deployment itself had no error/fatal entries in its inspected post-deploy window.

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
- visible sync state plus explicit `Sync now` and pending-sync retry controls;
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
- privacy-safe Settings diagnostics with Copy diagnostics;
- reader progress bar, page navigation controls, chapter selector, keyboard/touch navigation;
- optional Screen Wake Lock;
- bounded preload/lazy behavior and `content-visibility` containment for long chapters;
- optional browser E2E runner that does not install Playwright as a project dependency.

Copied diagnostics expose app version, online/display mode, account-cache binding as a boolean, owner-bound sync queue counts, service-worker state, site storage estimate, and aggregate provider freshness. They intentionally exclude account IDs, email addresses, tokens, passwords, relay secrets, service-role data, provider cookies, URLs containing private data, and manga titles.

## Providers

- MangaDex live chain was verified through search/detail/chapters/pages/image/no-result during provider hardening.
- WeebCentral relay public health has prior healthy evidence; a fresh direct relay-health fetch was not available from the current execution environment. External status sources were inconsistent on the upstream site, so provider/relay work must re-check the relay through an authoritative path before editing that subsystem.
- ComicK metadata search uses `api.comick.dev`. Its public chapter-list path was observed returning `403`, so ComicK is intentionally excluded as a new reader-discovery fallback while compatibility code remains for existing/imported identifiers.
- Production source failures remain explicit; no mock fallback is registered.

## Supabase

Production project: `gwpgaojsemcfikgynxwv`.

Live migration inspection on 2026-09-17 showed the current production chain through:

```text
20260917030319 restrict_library_progress_summary_rpc
```

Current architecture includes:

- RLS on account-owned data;
- least-privilege authenticated grants and no anonymous account-table access;
- canonical timestamped migrations;
- newer-only conflict guards for progress/history/settings;
- library-state tracking migration;
- account-bound compact progress-summary RPC with `SECURITY INVOKER` and no `anon`/`PUBLIC` execute access.

Latest live advisor state: performance clean; leaked-password protection remains the accepted plan-limited security warning.

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

## Pre-human-testing product hardening

Implemented and merged in PR #54:

- safe Settings diagnostics panel with copyable diagnostics;
- explicit `Sync now` / retry-pending-sync controls.

Still to implement and validate:

- more specific provider/offline/network/403/429/relay/missing-chapter error UX with safe Retry;
- signed-in account JSON export without credentials/session tokens/secrets/provider cookies;
- final accessibility/focus/keyboard/Escape/reduced-motion/loading/empty/error-state/layout pass;
- manual per-title chapter refresh plus visible last-checked information.

## Exact next autonomous task

Continue the remaining pre-human-testing hardening in small PWA-first PRs. Re-check provider/relay state before provider changes. Validate each runtime PR with required checks when available, Vercel preview, exact production deployment, production smoke where the execution environment can reach production, and runtime error/fatal logs. After all six improvements are implemented and verified, freeze unrelated feature expansion and prepare the manual PWA release-candidate matrix.

## Final PR #68 consolidation checkpoint

Current exact state:

- main: `c9060fd177b7d3cdf607cbde1945af875e283fa7`
- production deployment: `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA`
- production state: `READY`
- runtime commit: `c9060fd177b7d3cdf607cbde1945af875e283fa7`

Final PR #68 head `0e4fdb5eefd2f870c9e47435ac40ccec9735ff92` passed Repository Hygiene run `35283970854`, Web Quality run `35283970876` (install, unit tests, lint, typecheck, production build), and Production Smoke run `35283970838`. Final review-thread inspection was empty.

Vercel branch-preview creation was intermittently blocked by the Hobby build-rate limit and is not counted as a passing exact-head preview. The exact squash merge nevertheless deployed successfully to production. Error/fatal inspection scoped to `dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA` returned no matching entries in the inspected post-deploy window.

PR #68 also establishes the current behavior:

- account/profile/security controls are consolidated into Settings; `/account` remains a protected redirect to `/settings#account`;
- confirmation resend, password recovery, signed-in password change, and safe sign-out are implemented;
- sign-out is the final Settings action; theme selection is a shell quick toggle rather than a duplicated Settings card;
- a never-read title starts at the earliest available chapter; stale history alone does not manufacture Continue behavior;
- sync-status surfaces share a visibility-aware observer and count pending queue rows without hydrating outbox payloads;
- same-title library provider refresh requests are coalesced, very recent automatic checks can be reused, and refresh execution has a hard timeout;
- WeebCentral raw chapter HTML is not inserted into Next.js Data Cache when it can exceed the cache item limit; parsed chapter lists use bounded short-lived in-process caching and in-flight coalescing.

Fresh post-merge Production Smoke was rerun on 2026-09-17 from a GitHub-hosted Ubuntu runner against `https://pachimanga.frogilab.dev` and passed: 12 protected routes checked and 4 PWA icons checked. This satisfies the credential-free production-smoke evidence for runtime `c9060fd177b7d3cdf607cbde1945af875e283fa7`.

Manual release evidence still required: real registration/confirmation/recovery, Account A -> B -> A isolation, two-session/two-device sync, installed-PWA/device testing, reader-device validation, and representative imports.
