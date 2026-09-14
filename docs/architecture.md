# Pachimanga architecture

This document describes the current production architecture. It replaces the earlier MVP assumptions that Pachimanga could run as an anonymous local-only reader.

## Product boundary

Pachimanga is an authenticated private manga reader. Login or registration is mandatory before a user can access the library, browse sources, import data, open manga details, or use reader routes.

The production frontend is hosted at:

```text
https://pachimanga.frogilab.dev
```

The same hosted UI is used by browsers, installed PWAs, and the Tauri native shell.

## Runtime boundaries

Primary code areas:

- `src/app`: Next.js App Router pages, route handlers, auth callbacks, PWA metadata, and application routes.
- `src/proxy.ts`: Next.js request proxy entrypoint used to refresh/check Supabase sessions before protected routes continue.
- `src/lib/supabase`: browser/server Supabase clients and the request/session guard.
- `src/components`: shared application shell, navigation, account UI, and display primitives.
- `src/features`: feature-owned UI and reader logic.
- `src/lib/storage`: local cache plus synchronized library/progress/history/settings access.
- `src/lib/imports`: import parsers and migration helpers.
- `src/sources/core`: source contracts and registry behavior.
- `src/sources/mangadex`: MangaDex integration.
- `src/sources/comick`: ComicK integration.
- `src/sources/weebcentral`: WeebCentral URL/parsing/integration logic.
- `src/sources/mock` and `src/lib/mock-data.ts`: development/test support only; they are not a public demo mode.
- `src/lib/native`: browser-to-Tauri helper code.
- `src-tauri`: Rust/Tauri shell, capabilities, and native WeebCentral bridge.
- `relay/weebcentral`: optional locked-down homelab relay used by the web/PWA runtime.
- `supabase/migrations`: production database schema and Row Level Security migrations.

React/application code consumes normalized Pachimanga models. Provider-specific details should stay in the source adapters rather than spreading into unrelated UI code.

## Authentication and route protection

Supabase Auth is mandatory.

`src/proxy.ts` delegates to `src/lib/supabase/proxy.ts`. The guard refreshes/validates the Supabase session and checks claims before allowing application requests to continue.

Intentionally public application paths are limited to:

- `/auth...`
- `/offline`

All other matched application routes require authentication. Unauthenticated requests are redirected to `/auth`, optionally preserving a `next` destination.

Authenticated responses are marked `Cache-Control: private, no-store` by the session layer. Do not add a guest bypass, demo bypass, or route-specific anonymous exception without an explicit product decision.

The auth implementation uses publishable Supabase credentials only in browser-visible code. Service-role credentials must never be exposed to the frontend.

## User data and Supabase

The synchronized user model currently uses these public tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

User-owned rows include `user_id` and are protected by Supabase Row Level Security. Application queries also scope reads/writes to the authenticated user, but RLS remains the final security boundary.

At a high level:

```text
Supabase Auth user
    |
    +--> library_entries
    +--> reading_progress
    +--> reading_history
    +--> user_settings
    +--> profile metadata
```

Never replace RLS with client-side filtering alone.

## Local-first cache and account ownership

IndexedDB stores local copies of:

- library entries
- reading progress
- reading history

Reader settings are stored in localStorage with an account-specific key.

`src/lib/storage/reader-storage.ts` binds the browser cache to the authenticated Supabase user ID. If the current cache owner differs from the signed-in user, Pachimanga clears local library/progress/history data and legacy reader-setting keys before rebinding the cache.

This prevents one account from inheriting another account's local data on a shared browser/device.

The local cache is an optimization and offline/responsiveness layer, not the authorization source. Cloud reads/writes still require authentication.

Current synchronization behavior is intentionally simple:

- library reads reconcile remote rows into the local cache;
- library changes write Supabase first and then update IndexedDB;
- progress and history are upserted remotely and cached locally;
- reader settings are persisted per user in `user_settings` and cached locally.

Cross-device conflict resolution is an area for future hardening; see `docs/WORKPLAN.md`.

## Reader

Auto-scroll is measured in pixels per second. Each animation frame uses elapsed time rather than assuming a fixed frame rate:

```text
delta = speedPxPerSecond * elapsedMilliseconds / 1000
```

Elapsed time is capped after background/suspended frames to avoid jumps. Manual interaction pauses automatic movement.

Long-strip/manhwa pages are rendered at their natural content width within the reader rather than being reduced to narrow thumbnail-like columns. Future reader changes must be tested against both conventional paged manga and vertical long-strip chapters.

Progress is synchronized to the authenticated account.

## Source architecture

Pachimanga currently supports multiple provider paths.

### MangaDex and ComicK

These use their normal web/network integrations and do not depend on the native WeebCentral command.

### WeebCentral in browser/PWA

A normal browser cannot use the Tauri command. Production web/PWA access can use the optional private relay:

```text
Browser/PWA
    |
    v
pachimanga.frogilab.dev (Vercel)
    |
    | server-only relay token
    v
wc-relay.frogilab.dev
    |
    v
locked-down Frogilab relay
    |
    v
weebcentral.com
```

The relay exposes only known read operations. It is not an arbitrary `?url=` HTTP proxy. Manga image URLs are still loaded from their original image hosts, so normal page-image bandwidth is not intentionally relayed through Vercel/Supabase/the homelab.

See `docs/free-pwa-distribution.md`.

### WeebCentral in Tauri native builds

The Tauri shell exposes a dedicated Rust command named `weebcentral_request`.

The command accepts only supported WeebCentral operations and constructs/validates the upstream request inside native code. The JavaScript bridge must not be generalized into an arbitrary cross-origin fetch proxy.

The Android flow has been validated on a physical device. Requests originate from the device and return status, headers, and body to the hosted UI.

See `NATIVE.md`.

## Native shell

Tauri loads the remote production UI instead of bundling a separate frontend build for normal runtime use:

```text
Tauri WebView
    |
    v
https://pachimanga.frogilab.dev
```

Remote IPC capability is restricted to the production Pachimanga origin. Native changes are needed when Rust commands, Tauri capabilities, native manifests/plugins, signing, icons, or platform configuration change. Normal Next.js/React changes deploy through Vercel and are picked up by existing native shells when reopened.

## PWA behavior

The service worker exists for install/offline support, but authenticated application HTML/data must not become a shared public cache. Authenticated requests are treated as private and the app should not expose stale data from a previous account after logout/account changes.

The zero-cost iPhone/iPad distribution path is the PWA. It still requires a Pachimanga account after launch.

## Deployment

Production components:

```text
DNS / domain:   pachimanga.frogilab.dev
Frontend:       Vercel
Auth + data:    Supabase
Web WC relay:   optional Frogilab homelab + Cloudflare Tunnel
Native shell:   Tauri 2
CI/releases:    GitHub Actions
```

Vercel serves the Next.js application. Supabase owns authentication and synchronized user data. WeebCentral page/image traffic should not be moved through Supabase.

## Security invariants

Changes should preserve all of the following:

1. No guest/demo path into the application.
2. Auth is checked server-side for protected routes, not only by hiding client UI.
3. Supabase RLS remains enabled for user-owned data.
4. Browser cache ownership is tied to the authenticated user and cleared on account changes.
5. Relay credentials are server-only and never use a `NEXT_PUBLIC_` prefix.
6. The homelab relay is operation-limited, not an arbitrary HTTP proxy.
7. The Tauri command remains WeebCentral-specific and origin/capability constrained.
8. Signing keys, certificates, service-role credentials, and relay tokens are never committed.
9. Source integrations do not attempt to bypass CAPTCHAs, authentication, anti-bot controls, or upstream access restrictions.

## Quality gates

Web changes should pass:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Native changes should additionally pass:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

GitHub Actions contains separate `Web Quality` and `Native Quality` workflows. Production should also be smoke-tested anonymously to confirm protected pages resolve to the auth experience.
