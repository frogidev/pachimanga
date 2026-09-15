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
- `src/lib/offline` — offline/reconnect ordering helpers.
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

IndexedDB currently stores local copies of library entries, reading progress, reading history, and the progress outbox. Reader settings are cached in localStorage under an account-specific key.

`src/lib/storage/reader-storage.ts` binds local state to the authenticated Supabase user ID. When the stored owner differs from the current user, Pachimanga clears account-owned local library/progress/history state and legacy reader-setting keys before rebinding.

This is a security boundary for shared browsers/devices. Do not remove it unless replaced by an equivalent or stronger isolation mechanism.

## Synchronization semantics

The local cache is an optimization/offline layer, not the authorization source.

Current behavior is intentionally mixed by operation and must not be over-generalized:

### Library

- Library reads fetch the authenticated user's remote rows and reconcile them into IndexedDB.
- Add/remove writes Supabase first, then updates IndexedDB.
- Library mutation is therefore not currently a fully offline-first queue.

### Reading progress and history

`saveProgress` is local-first:

1. progress is written to IndexedDB;
2. history is written to IndexedDB;
3. a per-chapter entry is written to the IndexedDB `outbox`;
4. `flushProgressOutbox` attempts Supabase progress/history upserts;
5. successful queued items are deleted; failures remain queued for later retry.

Queued progress is ordered oldest-first so the final write for a chapter wins when a batch is flushed.

### Reader settings

Reader settings are cached under the current account-specific localStorage key and asynchronously upserted to `user_settings`.

### Work still required

Cross-device conflict semantics, stale-write ordering, reconnect coverage, and consistency between library/settings/progress offline behavior require further hardening. `WORKPLAN.md` defines the release work.

## Service worker and offline boundary

`public/sw.js` is intentionally conservative.

Current service-worker behavior:

- pre-caches `/offline` and PWA icons;
- leaves API requests alone;
- uses network-first navigation with `/offline` fallback;
- may cache same-origin images and `/_next/static/` assets;
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

- `Web Quality` validates tests/lint/typecheck for relevant web changes.
- `Native Quality` validates JS gates plus Rust/version consistency for relevant native/workflow changes.
- Vercel builds previews and production from Git integration.
- Native artifact/release workflows remain manual-only during the PWA phase.
- Production runtime changes require post-deploy smoke validation before a release-ready claim.

Branch protection/ruleset hardening is tracked as P0 operational work in `WORKPLAN.md`.

## Security invariants

Every change must preserve:

1. No guest/demo application path.
2. Server-side session enforcement for protected routes.
3. RLS on account-owned tables.
4. Account-bound local cache ownership.
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

Production changes should also smoke-test anonymous auth enforcement and inspect runtime errors after deployment.