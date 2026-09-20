# Pachimanga architecture

Pachimanga is a private, account-based manga reader. PWA/web v1.0.2 is the released production target. Native source is retained for compatibility; native distribution remains a separate manual phase requiring explicit user direction.

Production UI: `https://pachimanga.frogilab.dev`

## Current release runtime — 2026-09-19

Pachimanga v1.0.2 is the current PWA/web release line. The exact merged SHA, production deployment ID, CI evidence, and residual manual-validation limits are recorded in `verification-release-2026-09-19.md`.

The v1.0.2 line preserves the v0.4.0 architecture and includes subsequent Web Vitals attribution hardening, mobile-library behavior fixes, light-theme manga-detail correction, and reader browser-history/back-navigation hardening through PR #82.

Post-release engineering is feedback-driven: user-reported defects and friction should improve the existing PWA architecture without weakening the boundaries below. See `post-release-feedback.md`.

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

Global web response headers also deny framing/object embedding, constrain form submission to the same origin, and advertise HTTPS-only transport with HSTS. Broader script/style/worker CSP restrictions require browser/import verification before enforcement because OCR and SQL-WASM import paths load worker/WASM assets at runtime.

## Supabase data model

Account-owned synchronized tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`
- `library_collections`
- `library_collection_items`

All account-owned tables remain protected by owner RLS. Application queries also scope to the current authenticated user; query scoping complements RLS rather than replacing it.

`library_entries` stores personal reading state plus provider/update baseline metadata. `reading_progress` remains chapter-granular and drives dynamic manga percentage. `library_collections` and `library_collection_items` add owner-scoped user collections. `profiles.avatar_url` is the canonical avatar field alongside `display_name`, with Auth metadata retained only as a compatibility mirror.

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
- add/remove operations use an owner-bound IndexedDB `libraryOutbox` so pending local mutations survive reconnect and remote snapshots cannot visually undo unsynced intent;
- collection membership remains server-synchronized and owner-RLS protected.

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

### Source migration and duplicate consolidation

Library titles can be deliberately moved between supported source identities. Migration is explicit and confirmation-gated. Trusted database code copies/merges the target library entry, collection membership, tracker links, reading progress, and history before deleting the old source identity. Chapter progress is mapped only where chapter number/title evidence is unambiguous; any unmapped progress/history aborts the transaction rather than discarding data.

### External tracker boundary

AniList and MyAnimeList are optional integrations. OAuth bearer/refresh tokens remain in account-bound browser IndexedDB and are cleared on account switch/sign-out; they are never stored in Supabase or included in account export. Supabase stores only owner-RLS-protected manga-to-tracker identifiers so title associations can restore across devices. Tracker controls remain unavailable when the corresponding public OAuth client configuration is absent.

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

GitHub Actions was observed available again on 2026-09-19. Use the normal protected hosted checks; if future quota/capacity prevents a run, keep the missing signal explicit and do not weaken gates.

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

## Post-release validation backlog

Autonomous hardening is merged into the v1.0.2 baseline. Remaining real-world evidence remains valuable after release:

- registration, confirmation, recovery, logout/login, and Account A -> B -> A isolation;
- two-session/two-device synchronization and clock-skew behavior;
- live signed-in production data on Library/Browse/Updates/History;
- installed PWA behavior on representative iPhone/iPad/Android/desktop devices;
- conventional and long-strip reader behavior on physical devices;
- representative supported import formats;
- a fresh credential-free production smoke on the exact release runtime from a network-capable environment.

Do not convert unobserved evidence into completed claims. See `WORKPLAN.md`.

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

## Current PWA release architecture — v1.0.2 / 2026-09-19

The v1.0.2 architecture carries forward the PR #68 and PR #72/#73/#74 consolidation and adds the post-release fixes through PR #82:

- account profile/security controls live inside `/settings`; protected `/account` redirects to `/settings#account`;
- display name/avatar are stored canonically in `profiles`, mirrored to Auth metadata for compatibility, and surfaced in desktop/mobile shell identity UI;
- public auth remains in `/auth`, including signup confirmation resend and password recovery;
- light auth UI has an explicit warm-paper treatment and themed browser autofill;
- signed-in password change uses Supabase Auth and sign-out clears account-bound browser state only after Supabase sign-out succeeds;
- shell theme control is a lightweight quick toggle below Settings navigation;
- Settings ends with sign-out and groups reader behavior, sync, PWA/device state, export, diagnostics, and account controls;
- sync-status UI instances share a visibility-aware observer and inspect outbox counts without hydrating payloads;
- library add/remove uses an owner-bound mutation outbox;
- user collections are RLS-protected and tied to existing library rows;
- `/api/library/refresh` coalesces concurrent same-title refreshes, reuses recent checks, and enforces an overall timeout;
- WeebCentral chapter HTML avoids oversized Next.js raw-response cache entries; parsed lists use bounded short-lived caching;
- first-read opens the earliest available chapter while real progress retains Continue behavior;
- export/import round-trip, richer reading statistics, search deduplication, logical clock hardening, quota-aware/cancellable offline saving, Web Vitals telemetry, and chapter publication dates are part of the merged baseline.

These changes preserve mandatory Supabase Auth/RLS ownership, anonymous-route boundaries, relay allowlists, and PWA-first delivery.

## Release data-model additions

Production migration `20260918010000_pwa_collections_profile_and_clear_rpc.sql` adds two account-owned collection tables:

- `library_collections` stores user-named collections;
- `library_collection_items` maps existing `library_entries` into those collections and cascades membership deletion when a library entry is removed.

Both tables remain RLS-protected and explicitly user-scoped. Collection membership is synchronized server-side and does not create an anonymous/local-only parallel library.

The same migration adds `profiles.avatar_url` so `profiles` becomes the canonical personalization row while Auth user metadata remains a compatibility mirror.

The destructive “clear entire library” path prefers the authenticated `clear_my_library()` RPC so library, progress, and history deletes occur in one database transaction. Runtime code retains a compatibility fallback for older/non-production environments where the migration is not present; production has the migration applied.

The v1.0.2 client retains the owner-bound IndexedDB `libraryOutbox` for library add/remove operations. Remote snapshots are reconciled with pending mutations so reconnect or a truncated/older remote view cannot visually undo an unsynced local mutation.
