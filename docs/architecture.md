# Pachimanga architecture

Pachimanga is a private, account-based manga reader. The PWA/web application is the active production target; native source is retained for compatibility but native distribution is deferred until the PWA release-candidate gate is complete.

Production UI: `https://pachimanga.frogilab.dev`

## Current runtime state — 2026-09-17

- observed `main`: `b54beabf1b6dcc23a67f977e834487ada595a44f`;
- latest production runtime: `dcc14856863ee3ab7a9877e5c7cd9bf953582c95`;
- Vercel deployment: `dpl_34FBFiKQBGwfYNNRedyo2ggCFB2Q`, `READY`;
- `main` is newer only by the PR #63 verification/docs commit and is runtime-equivalent to the deployed PR #62 squash commit;
- PR #62 passed required Repository Hygiene and Web Quality, including install, unit tests, lint, typecheck, and production build;
- PR Production Smoke passed against the anonymous production boundary;
- direct post-deploy production smoke still needs a fresh rerun from a network-capable environment because the latest agent-container attempt failed DNS resolution before assertions ran.

The remaining PWA release-candidate blockers are real-account/device/import evidence, not missing autonomous runtime hardening. See `WORKPLAN.md` for the exact matrix.

## Non-negotiable boundaries

1. Authentication is mandatory for normal application routes.
2. There is no guest/demo/anonymous reader mode.
3. Supabase RLS is the final database row-isolation boundary.
4. Browser-local state and offline chapter downloads are bound to the authenticated user.
5. Authenticated application HTML/data is not treated as a reusable public PWA shell.
6. Production provider failures remain explicit; mock data is never a fallback.
7. WeebCentral bridges are operation-limited and never arbitrary proxies.
8. `403`/`429`, auth, CAPTCHA, or anti-bot controls are never bypassed.
9. Browser-visible code contains only publishable client credentials, never service-role/relay secrets.

## Runtime map

```text
Browser / installed PWA
        |
        v
Next.js 16 App Router on Vercel
        |
        +--> Supabase Auth + Postgres/RLS
        +--> MangaDex
        +--> ComicK metadata/compatibility paths
        +--> server-side operation-limited WeebCentral relay client
                  |
                  v
             private relay
                  |
                  v
             WeebCentral

Retained Tauri shell
        |
        v
same production web UI
        |
        +--> same Supabase account model
        +--> dedicated Rust WeebCentral command
```

Primary code areas:

- `src/app` — App Router pages, route handlers, auth callbacks, metadata;
- `src/proxy.ts` / `src/lib/supabase` — session enforcement and Supabase clients;
- `src/features` / `src/components` — application UI;
- `src/lib/storage` — account-bound cache/sync;
- `src/lib/offline` — outbox ordering/account ownership/freshness;
- `src/lib/imports` — OCR/backup/JSON import engines;
- `src/sources/**` — provider adapters;
- `public/sw.js` — PWA service worker;
- `relay/weebcentral` — browser/PWA relay;
- `src-tauri` — retained native shell/bridge;
- `supabase/migrations` — canonical database history.

## Authentication boundary

`src/proxy.ts` and the Supabase server/proxy helpers enforce protected routes.

Intentionally anonymous application surfaces are limited to auth flows and `/offline`. Protected application navigation without a valid session resolves to the authentication experience. Session-bearing responses are expected to remain private/non-shared-cacheable.

## Supabase data model

Account-owned synchronized tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

All account-owned tables remain protected by owner RLS. Application queries also scope to the current authenticated user; query scoping complements RLS rather than replacing it.

`library_entries` now stores both personal reading state and provider/update baseline metadata. `reading_progress` remains chapter-granular and drives dynamic manga percentage.

### Compact Library progress summary

The normal Library dashboard does not download thousands of progress rows. It calls `get_library_progress_summaries()`, a `SECURITY INVOKER` function that:

- accepts no caller-provided user ID;
- filters on `auth.uid()`;
- returns compact per-title progress/completion/history summary rows;
- is executable by `authenticated` only, not `anon`/`PUBLIC`.

The deterministic paginated progress loader remains a compatibility/failure fallback. Partial/incomplete snapshots are never treated as authoritative unread state.

## Local cache and account ownership

IndexedDB/localStorage store account-bound copies of Library/progress/history/settings/outboxes. The service-worker chapter cache is also account-bound.

When the authenticated owner changes, Pachimanga clears/rebinds account-owned local state rather than exposing the previous account's data. Progress/settings outbox entries contain the owner ID and cross-account/legacy entries are discarded instead of replayed under another user.

Logout intentionally clears account-bound local state. A subsequent login reconstructs from synchronized remote data. Large remote progress datasets are paginated deterministically; the previous one-page truncation regression that displayed completed titles as `0% / Plan to Read` is fixed.

## Synchronization semantics

### Library

- online reads reconcile remote `library_entries` into the current user's local cache;
- temporary remote read failure may use the already-bound local cache;
- add/remove operations remain remote-first rather than fully offline queued.

### Reading progress/history

Progress writes are local-first:

1. write local progress/history;
2. write owner-bound outbox entry;
3. attempt remote upserts;
4. keep failed owned entries queued for reconnect;
5. discard stale/cross-account queue entries.

Newest timestamp wins locally; production database triggers reject older/equal timestamp updates so delayed offline writes cannot roll remote state backward.

### Reader settings

Reader settings use an account-specific local cache plus owner-bound outbox. Server freshness guards protect cross-device state from stale arrival order.

### Visible sync state

The shell/Settings expose `Synced`, `Syncing · N pending`, and offline/pending states based on the real owner-bound queues. Settings also exposes explicit `Sync now` and retry controls; these flush the same owner-bound queues rather than creating a separate synchronization path.

## Library state model

Provider publication status and personal reading status are independent.

Personal states:

- Plan to Read
- Reading
- Completed
- On Hold
- Dropped

Automatic status derives from synchronized progress unless the user sets a manual override. A manga may correctly be both provider `complete` and user `Completed`.

Chapter update tracking stores the provider baseline, latest chapter information, check/change timestamps, and new chapter count. First refresh establishes a baseline; later growth increments unread update counts. Opening a title acknowledges updates.

## Provider architecture

### MangaDex

MangaDex is a validated readable provider. Feed pagination excludes external-only chapters that cannot be served by MangaDex@Home.

### ComicK

ComicK metadata/search compatibility uses `api.comick.dev`. Public chapter-list access has been observed returning `403`, so ComicK is not used as a new reader-discovery fallback. Existing/import compatibility code remains, and failures are explicit.

### WeebCentral browser/PWA

Browser/PWA traffic uses the private operation-limited relay when configured. Trusted server-side code maps known operations/IDs to the fixed upstream; callers cannot provide arbitrary destination URLs. Relay tokens remain server-only.

### WeebCentral Tauri

The retained native shell uses a dedicated Rust `weebcentral_request` command. It remains source-specific and operation-limited.

## Service worker and offline boundary

Current `public/sw.js` behavior:

- public `/offline` + PWA icon shell pre-cache;
- network-first application navigation;
- `/offline` fallback on navigation failure;
- `/api/**` excluded from service-worker caching;
- bounded same-origin runtime image/static cache;
- dedicated `pachimanga-chapters-v1` cache only for explicitly downloaded chapter page images;
- account owner binding/clearing for chapter cache;
- explicit update lifecycle: a new worker waits and the user chooses when to reload;
- stale Pachimanga cache versions are evicted without deleting unrelated origin caches.

The offline page is not an anonymous copy of authenticated application state.

## Reader architecture

The Reader keeps continuous scroll as the common model for conventional and long-strip content.

Current hardening includes:

- elapsed-time auto-scroll with stall caps;
- manual-interaction pause behavior;
- reduced-motion protection;
- progress bar;
- previous/next page controls and mobile tap zones;
- Page Up/Page Down plus chapter keyboard navigation;
- chapter selector where layout permits;
- exact local pixel resume with synchronized percentage fallback;
- bounded preload/lazy image behavior;
- `content-visibility` containment for distant long-strip pages;
- optional Screen Wake Lock;
- explicit offline chapter save/remove controls.

Real-device memory/safe-area/Wake Lock/update/offline behavior remains release evidence, not an automated claim.

## Import architecture

Supported paths:

- OCR/image extraction with review;
- Tachiyomi/Mihon `.tachibk` / `.proto.gz`;
- Tachimanga `.tmb`;
- JSON fallback.

Heavy engines remain dynamically imported from `src/lib/imports/**` so ordinary Library/Reader routes do not pull OCR/SQLite/protobuf/archive engines into the core bundle. Regression tests guard this boundary.

Imported titles always resolve into the normal signed-in Library model; there is no anonymous import store.

## Deployment and validation

Vercel deploys hosted-runtime changes from `main`. `scripts/vercel-ignore-build.mjs` fails open to build when comparison SHAs are missing/unusable and skips only proven non-runtime changes.

Current validation path is:

```text
npm ci + npm run verify
        -> required GitHub Repository Hygiene/Web Quality checks
        -> Vercel preview/build for runtime changes when available
        -> merge
        -> exact production READY deployment
        -> production smoke
        -> Vercel runtime error/fatal inspection
```

A temporary Vercel Hobby build-rate limit is a platform/capacity blocker, not evidence that a runtime change is safe. Keep runtime PRs unmerged until required preview/build evidence can be obtained under the active project policy.

Do not interpret a docs/tests-only `main` commit without a new Vercel production build as deployment drift when runtime-equivalence is proven.

## Remaining release-candidate work

Autonomous pre-human-testing hardening is complete. The remaining gate requires observed real-world evidence for:

- registration, confirmation, recovery, logout/login, and Account A -> B -> A isolation;
- two-session/two-device synchronization and clock-skew behavior;
- live production data on Library/Browse/Updates/History without placeholder substitution;
- installed PWA behavior on representative iPhone/iPad/Android/desktop devices;
- conventional and long-strip reader behavior;
- representative supported import formats;
- a fresh credential-free production smoke on the current runtime from a network-capable environment.

Do not replace this evidence with additional unrelated feature expansion. See `WORKPLAN.md` for the exact checklist.

## Required verification

Application changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Equivalent: `npm run verify`.

Runtime changes additionally require Vercel preview/build evidence, production `READY`, production smoke, and runtime-error review.

Schema/auth changes additionally require migration/RLS/grant/advisor review.

## Current PWA consolidation — 2026-09-17

PR #68 established the current PWA-facing architecture:

- account profile/security controls live inside `/settings`; protected `/account` redirects to `/settings#account` for compatibility;
- public auth remains in `/auth`, including signup confirmation resend and password recovery;
- signed-in password change uses Supabase Auth and sign-out clears account-bound browser state only after Supabase sign-out succeeds;
- shell theme control is a lightweight quick toggle below Settings navigation; the full theme selector is no longer duplicated inside Settings;
- Settings ends with the sign-out action and otherwise groups reader behavior, sync, PWA/device state, export, and diagnostics;
- sync-status UI instances share a visibility-aware observer and inspect outbox counts without hydrating payloads;
- `/api/library/refresh` coalesces concurrent same-title refreshes, reuses very recent automatic checks, and enforces an overall timeout;
- WeebCentral chapter HTML is fetched without Next.js raw-response caching when too large; parsed chapter lists use a bounded short-lived in-process cache with in-flight coalescing;
- the reader-detail start target is derived from the earliest available chapter when no real progress exists, while existing progress retains Continue behavior.

These changes do not alter the mandatory Supabase Auth/RLS ownership model, anonymous-route boundary, relay allowlist, or PWA-first delivery policy.
