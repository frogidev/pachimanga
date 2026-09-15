# Pachimanga architecture

This document describes the current production architecture. Pachimanga is an authenticated private reader; earlier anonymous/local-only MVP assumptions are obsolete.

Production UI:

```text
https://pachimanga.frogilab.dev
```

The hosted UI is used by normal browsers, installed PWAs, and the retained Tauri shell.

## Product boundary

Authentication is required before a user can use normal application routes such as Library, Browse, Import, History, Settings, manga detail, or Reader.

Core invariants:

1. No guest/demo/anonymous reader path.
2. Supabase RLS is the final database row-isolation boundary.
3. Data API object grants are least-privilege and do not replace RLS.
4. Local cache ownership follows the authenticated user.
5. Production source failures remain explicit; mock data is never a user-facing fallback.
6. WeebCentral network bridges are operation-limited, not arbitrary proxies.
7. Authenticated application data is not treated as public/shared-cache content.

## Active delivery model

PWA/web is the active production target. Native source remains in the repository for future distribution, but native artifact workflows are manual-only until the PWA release-candidate gate in `WORKPLAN.md` is satisfied.

This means normal product/UI/API changes ship through Vercel. Native work is required only when the Rust/Tauri boundary itself changes or when the final platform-distribution phase begins.

## Runtime map

Primary code areas:

- `src/app` — Next.js App Router pages, route handlers, auth callbacks, PWA metadata, and application routes.
- `src/proxy.ts` — request/session enforcement entrypoint.
- `src/lib/supabase` — browser/server Supabase clients and session guard.
- `src/components` — shared application shell/navigation/UI primitives.
- `src/features` — feature-owned UI for browse, library, manga detail, reader, history, install, and native-specific views.
- `src/lib/storage` — account-bound IndexedDB/localStorage persistence plus Supabase synchronization.
- `src/lib/offline` — offline/reconnect ordering, cache ownership, and freshness helpers.
- `src/lib/imports` — OCR/backup/JSON import parsing and migration helpers.
- `src/sources/core` — normalized source contract/registry plus bounded provider retry/pagination helpers.
- `src/sources/mangadex` — MangaDex integration.
- `src/sources/comick` — ComicK integration.
- `src/sources/weebcentral` — WeebCentral parsing/network integration.
- `src/sources/mock` and mock-data modules — test/development support only.
- `src/lib/native` — browser-to-Tauri helper code.
- `src-tauri` — Tauri 2 shell, capabilities, and Rust bridge.
- `relay/weebcentral` — optional locked-down browser/PWA relay.
- `supabase/migrations` — canonical timestamped production database/RLS/grant/sync history.
- `supabase/legacy-migrations` — preserved pre-canonical SQL artifacts, never replayed by the active migration chain.
- `public/sw.js` — PWA install/offline service worker.

Provider-specific details stay behind normalized Pachimanga models instead of leaking through unrelated UI.

## Route/authentication boundary

Supabase Auth is mandatory.

`src/proxy.ts` delegates session handling to `src/lib/supabase/proxy.ts`. Protected application requests are checked/refreshed before continuing.

Intentionally anonymous application paths are limited to:

- `/auth...`
- `/offline`

Other matched application routes require authentication. Unauthenticated navigation resolves to the auth experience, optionally preserving a destination.

Authenticated responses are intended to remain `Cache-Control: private, no-store` where session enforcement applies. Do not add route-specific guest exceptions without an explicit product decision.

Browser-visible code uses publishable Supabase credentials only. Service-role credentials must never be exposed to the frontend.

## Supabase data model

Synchronized user tables currently include:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

Account-owned rows include `user_id` and are protected by RLS. Application code also scopes reads/writes to the current user; that query scoping complements RLS rather than replacing it.

High-level relationship:

```text
Supabase Auth user
    |
    +--> profile
    +--> library_entries
    +--> reading_progress
    +--> reading_history
    +--> user_settings
```

The active production migration chain is mirrored under `supabase/migrations/` with Supabase timestamp prefixes. Pre-canonical `001`/`002`/`003` SQL is preserved under `supabase/legacy-migrations/` for provenance only and must not be replayed by `db reset`/`db push`.

Production grants intentionally give `anon` no account-table or identity-sequence access. `authenticated` receives only the CRUD/sequence privileges required by the application, while RLS decides which rows are visible or mutable.

## Local cache ownership

IndexedDB stores account-owned local copies of library entries, reading progress, reading history, and the progress outbox. Reader settings are cached in localStorage under an account-specific key.

`src/lib/storage/reader-storage.ts` binds local state to the authenticated Supabase user ID. When the stored owner differs from the current user, Pachimanga clears every account-bound IndexedDB store (`library`, `progress`, `history`, and `outbox`) plus legacy reader-setting keys before rebinding.

Every new progress outbox entry also records the authenticated `userId`. Before flushing, Pachimanga accepts only entries explicitly owned by the active account; legacy, unowned, or other-account entries are discarded instead of being replayed under the wrong user.

This is a security boundary for shared browsers/devices. Do not remove or weaken it unless replaced by an equivalent or stronger isolation mechanism.

## Synchronization semantics

The local cache is an optimization/offline layer, not the authorization source. Current behavior intentionally differs by operation.

### Library

- Online reads fetch the authenticated user's remote rows and reconcile them into IndexedDB.
- If the remote read is temporarily unavailable, the current account's bound IndexedDB library is returned instead of exposing another account or inventing mock data.
- Add/remove mutations are remote-first and then update IndexedDB.
- Library mutation is therefore intentionally not a fully offline-first queue.

### Reading progress

`saveProgress` is local-first:

1. progress is written to IndexedDB;
2. history is written to IndexedDB;
3. a per-chapter outbox entry is written with the active `userId`;
4. `flushProgressOutbox` filters the queue to the active account and attempts Supabase progress/history upserts;
5. successful queued items are deleted; failed owned items remain queued for later retry;
6. stale legacy/cross-account items are deleted without being sent.

The outbox object store is keyed by `chapterId`, so repeated local saves for the same chapter replace the pending entry with the newest local state before reconnect. Queued entries are also ordered oldest-first across chapters for deterministic flush behavior.

When loading chapter progress, Pachimanga compares cached and remote `updatedAt` timestamps. The newer value wins; the remote value wins exact ties. This prevents a newer pending local value from being immediately overwritten by an older remote snapshot and allows a newer remote-device value to replace stale cache state.

Production also enforces freshness at the database boundary. A `BEFORE UPDATE` trigger on `reading_progress` keeps the stored row whenever an incoming `updated_at` is older than or equal to the stored timestamp. This means delayed offline writes cannot roll progress backward solely because they arrive later. Exact timestamp ties preserve the already-stored remote row.

### Reading history

- Online reads come from the authenticated user's remote history and refresh the local cache.
- If the remote read fails temporarily, the bound local history is returned in reverse chronological order.
- Progress saves update local history immediately and upsert the remote history record during outbox flush.
- The history conflict target keeps one current row per user/source/manga.
- A production `BEFORE UPDATE` trigger accepts a history replacement only when incoming `read_at` is strictly newer than the stored row; older/equal delayed writes keep the existing remote history.

### Reader settings

Reader settings are cached under the current account-specific localStorage key and asynchronously upserted to `user_settings`.

- Remote settings replace the local cache when successfully loaded.
- If the remote read fails, the account-bound local settings remain usable.
- Background save failures do not destroy the local value.
- Settings do not currently use an IndexedDB outbox, so guaranteed eventual remote delivery is not equivalent to progress sync.
- A production `BEFORE UPDATE` trigger prevents an older/equal `updated_at` from replacing newer remote settings, protecting cross-device state from stale arrival order.

### Timestamp conflict boundary

The authoritative cross-device ordering fields are:

```text
reading_progress.updated_at
reading_history.read_at
user_settings.updated_at
```

For all three, a strictly newer timestamp may update an existing row; older or equal timestamps keep the existing row. Inserts are unaffected. Trigger helper functions have RPC execution revoked from `anon` and `authenticated`.

Client timestamps remain the ordering signal, so device clock quality is still relevant. The private-user release does not currently implement vector clocks or per-device logical sequence numbers.

### Remaining sync decisions

The major stale-arrival regression is now blocked server-side. Remaining Phase 10 work is narrower:

- decide whether reader settings need guaranteed eventual delivery via an explicit outbox rather than best-effort asynchronous save;
- keep library add/remove intentionally online-only or design an owner-bound mutation queue;
- validate the timestamp policy with real two-device/account E2E, including clock-skew observations;
- surface pending-sync UI only if it materially improves the private-user workflow.

## Service worker and offline boundary

`public/sw.js` is intentionally conservative.

Current service-worker behavior:

- pre-caches `/offline` and PWA icons;
- leaves API requests alone;
- uses network-first navigation with `/offline` fallback;
- may cache same-origin images and `/_next/static/` assets;
- evicts stale Pachimanga-owned cache versions on service-worker activation while leaving unrelated caches alone;
- does not intentionally cache authenticated application HTML as a reusable public shell.

The offline page is a fallback surface, not an anonymous copy of the authenticated application.

Changing caching strategy requires explicit account-isolation review.

## Reader architecture

The reader supports conventional pages and vertical long-strip/manhwa content.

Auto-scroll is elapsed-time based:

```text
delta = speedPxPerSecond * elapsedMilliseconds / 1000
```

Elapsed time is capped after background/suspend intervals to prevent large jumps. Manual wheel/touch interaction pauses automated movement where applicable.

Long-strip images must keep usable content width. A prior regression collapsed them into narrow columns; every material layout change must re-test this case.

Reader progress uses the authenticated account plus the account-bound local cache/outbox described above.

## Manga detail/read-state behavior

Manga detail resolves provider-specific data through source adapters, then renders normalized manga/chapter models. Chapter lists support pagination and per-chapter read-state controls. Bulk read/unread operations update local progress and library summary state.

These controls remain account-scoped and must not invent chapter links when a provider exposes metadata without readable English chapters.

## Import architecture

Supported import paths include:

- OCR/image text extraction with user review;
- Tachiyomi/Mihon backup formats;
- Tachimanga backup format;
- JSON fallback.

Import parsing belongs under `src/lib/imports`. Imported titles resolve into the normal signed-in library model; there is no parallel anonymous import store.

## Source architecture

The production source registry must never register the mock provider. Repository hygiene tests guard this boundary.

All hosted provider GETs use a bounded transient retry policy: one short retry for network/socket failures or HTTP 502/503/504. Rate limits, authentication/refusal responses, validation errors, normal 4xx responses, and caller aborts are not retried. This addresses brief upstream socket closures without creating retry storms or hiding provider failures.

Chapter-list pagination is bounded. MangaDex currently collects at most 500 feed rows and ComicK at most 600 chapter rows per detail load; providers may return fewer based on their reported totals or short pages.

### MangaDex and ComicK

These use their normal application/network integrations and remain independent from the native WeebCentral bridge. Empty page-image responses are treated as explicit source failures rather than a successful empty reader.

### WeebCentral in browser/PWA

A browser cannot call Tauri IPC. Browser/PWA access can use the optional private relay:

```text
Browser / installed PWA
    |
    v
pachimanga.frogilab.dev (Vercel)
    |
    | server-only relay token
    v
wc-relay.frogilab.dev
    |
    v
operation-limited Frogilab relay
    |
    v
weebcentral.com
```

The relay accepts known read operations only. There is no caller-controlled arbitrary `?url=` proxy. IDs/query inputs are normalized/validated by trusted code.

Page-image URLs are used from their original hosts where possible, so image bytes are not intentionally routed through Supabase or the relay.

See `free-pwa-distribution.md`.

### WeebCentral in Tauri

The Tauri shell exposes `weebcentral_request`, a dedicated Rust command for supported read operations. Trusted native code constructs/validates upstream requests.

The command must not become an arbitrary cross-origin fetch bridge. Upstream refusal/status such as 403/429 is surfaced rather than bypassed.

See `../NATIVE.md`.

## Native shell

The Tauri WebView loads:

```text
https://pachimanga.frogilab.dev
```

Remote IPC capabilities remain restricted to the intended Pachimanga production origin. A new native artifact is needed when changing Rust commands, capabilities, plugins, platform configuration, embedded icons/metadata, signing, or bundling.

Normal React/Next.js changes ship through Vercel and are consumed by existing shells on reload/reopen.

Native distribution is currently deferred; source compatibility is retained.

## Deployment topology

```text
DNS/domain:     pachimanga.frogilab.dev
Frontend/API:   Vercel
Auth + data:    Supabase
Web WC relay:   optional Frogilab homelab + Cloudflare Tunnel
Native shell:   Tauri 2
CI:             GitHub Actions
Native builds:  manual GitHub Actions workflows
```

Vercel serves the Next.js product. Supabase owns account authentication and synchronized user data. WeebCentral image/page traffic should not be moved through Supabase as a convenience proxy.

## CI/deployment behavior

- `Protect main` is an active GitHub ruleset for the default branch. Pull requests, up-to-date branches, resolved review threads, squash-only merge, deletion/force-push blocking, and the required `hygiene` + `quality` checks are enforced with no bypass actors.
- `Repository Hygiene` runs on every pull request and every push to `main`, including docs-only changes. It covers merge-marker hygiene plus repository security/regression invariants.
- `Web Quality` always reports the required `quality` result. Runtime changes run unit tests, lint, typecheck, and a production build; non-runtime-only changes may skip the expensive steps while still producing the gate.
- `Native Quality` validates JS gates plus Rust/version consistency for relevant native/workflow changes.
- Active checkout/setup-node actions use the Node 24 action runtime while the Pachimanga application test/build runtime stays pinned to Node 22.
- Vercel builds previews and production from Git integration; Vercel account/build-rate limits are operational failures and must not be mistaken for application build failures.
- Native artifact/release workflows remain manual-only during the PWA phase.
- Production runtime changes require a READY deployment plus post-deploy smoke validation before a release-ready claim.

GitHub issue #10 is closed because the merge-protection exit criteria are met.

## Security invariants

Every change must preserve:

1. No guest/demo application path.
2. Server-side session enforcement for protected routes.
3. RLS on account-owned tables.
4. Least-privilege Data API grants; no anonymous account-table/sequence access.
5. Account-bound local cache and outbox ownership.
6. Newer-only server conflict semantics for timestamped progress/history/settings updates.
7. No server secret in `NEXT_PUBLIC_*` variables or client bundles.
8. Operation-limited relay; no arbitrary HTTP proxy.
9. Source-specific Tauri bridge and constrained IPC origin.
10. No committed signing keys/certificates/service-role keys/relay tokens/passwords.
11. No CAPTCHA/anti-bot/authentication circumvention.
12. No authenticated HTML/data turned into a shared public PWA cache.

## Required verification

Application changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Native-impacting changes additionally:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

Production database changes additionally require migration-history, RLS/grant/trigger inspection plus Supabase security/performance advisor review.

Production runtime changes should also smoke-test anonymous auth enforcement and inspect runtime errors after deployment. A green GitHub build is not a substitute for confirming the corresponding Vercel production deployment reached `READY`.
