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
2. Supabase RLS is the final database isolation boundary.
3. Local cache ownership follows the authenticated user.
4. Production source failures remain explicit; mock data is never a user-facing fallback.
5. WeebCentral network bridges are operation-limited, not arbitrary proxies.
6. Authenticated application data is not treated as public/shared-cache content.

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
- `src/sources/core` — normalized source contract/registry.
- `src/sources/mangadex` — MangaDex integration.
- `src/sources/comick` — ComicK integration.
- `src/sources/weebcentral` — WeebCentral parsing/network integration.
- `src/sources/mock` and mock-data modules — test/development support only.
- `src/lib/native` — browser-to-Tauri helper code.
- `src-tauri` — Tauri 2 shell, capabilities, and Rust bridge.
- `relay/weebcentral` — optional locked-down browser/PWA relay.
- `supabase/migrations` — database schema/RLS history.
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

Existing migrations are append-only history. New schema changes must be new migrations.

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
- Library mutation is therefore not a fully offline-first queue.

### Reading progress

`saveProgress` is local-first:

1. progress is written to IndexedDB;
2. history is written to IndexedDB;
3. a per-chapter outbox entry is written with the active `userId`;
4. `flushProgressOutbox` filters the queue to the active account and attempts Supabase progress/history upserts;
5. successful queued items are deleted; failed owned items remain queued for later retry;
6. stale legacy/cross-account items are deleted without being sent.

Queued progress is ordered oldest-first so the final queued write for a chapter wins within one flush batch.

When loading chapter progress, Pachimanga compares the cached and remote `updatedAt` timestamps. The newer value wins; the remote value wins exact ties. This prevents a newer pending local value from being immediately overwritten by an older remote snapshot and allows a newer remote-device value to replace stale cache state.

This is client-side freshness reconciliation, not a database-level compare-and-swap. A later stale write from another device can still require stronger server-side conflict semantics before Phase 10 is considered complete.

### Reading history

- Online reads come from the authenticated user's remote history and refresh the local cache.
- If the remote read fails temporarily, the bound local history is returned in reverse chronological order.
- Progress saves update local history immediately and upsert the remote history record during outbox flush.
- Current database conflict semantics keep the latest row per configured history conflict target; this still needs explicit multi-device policy review in `WORKPLAN.md`.

### Reader settings

Reader settings are cached under the current account-specific localStorage key and asynchronously upserted to `user_settings`.

- Remote settings replace the local cache when successfully loaded.
- If the remote read fails, the account-bound local settings remain usable.
- Background save failures do not destroy the local value.
- Settings do not currently use an IndexedDB outbox, so guaranteed eventual remote delivery is not yet equivalent to progress sync.

### Work still required

Phase 10 remains open for stronger cross-device stale-write rejection, explicit settings conflict/retry semantics, library offline-mutation policy, and end-to-end reconnect/account-switch validation. See `WORKPLAN.md`.

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

### MangaDex and ComicK

These use their normal application/network integrations and remain independent from the native WeebCentral bridge.

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

- `Repository Hygiene` runs on every pull request and every push to `main`, including docs-only changes. It covers merge-marker hygiene plus selected repository security/regression invariants.
- `Web Quality` validates unit tests, lint, typecheck, and production build for relevant web/runtime changes.
- `Native Quality` validates JS gates plus Rust/version consistency for relevant native/workflow changes.
- Active checkout/setup-node actions use the Node 24 action runtime while the Pachimanga application test/build runtime stays pinned to Node 22.
- Vercel builds previews and production from Git integration; Vercel account/build-rate limits are operational failures and must not be mistaken for application build failures.
- Native artifact/release workflows remain manual-only during the PWA phase.
- Production runtime changes require a READY deployment plus post-deploy smoke validation before a release-ready claim.

Branch protection/ruleset hardening is tracked in GitHub issue #10 and `WORKPLAN.md`.

## Security invariants

Every change must preserve:

1. No guest/demo application path.
2. Server-side session enforcement for protected routes.
3. RLS on account-owned tables.
4. Account-bound local cache and outbox ownership.
5. No server secret in `NEXT_PUBLIC_*` variables or client bundles.
6. Operation-limited relay; no arbitrary HTTP proxy.
7. Source-specific Tauri bridge and constrained IPC origin.
8. No committed signing keys/certificates/service-role keys/relay tokens/passwords.
9. No CAPTCHA/anti-bot/authentication circumvention.
10. No authenticated HTML/data turned into a shared public PWA cache.

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

Production changes should also smoke-test anonymous auth enforcement and inspect runtime errors after deployment. A green GitHub build is not a substitute for confirming the corresponding Vercel production deployment reached `READY`.
