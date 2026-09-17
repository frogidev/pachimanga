# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a private, account-based manga reader built with Next.js 16 and Supabase. The authenticated PWA/web app is the active product target; native distribution remains deferred until the PWA release-candidate gate is complete.

Production: `https://pachimanga.frogilab.dev`

## Current state — 2026-09-17

```text
main:       c9060fd177b7d3cdf607cbde1945af875e283fa7
production: dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA
state:      READY
runtime:    c9060fd177b7d3cdf607cbde1945af875e283fa7
```

PR #68 merged the consolidated PWA hardening branch. Its final required GitHub gates passed on head `0e4fdb5eefd2f870c9e47435ac40ccec9735ff92`: Repository Hygiene, Web Quality (install, tests, lint, typecheck, production build), and Production Smoke. Exact-head Vercel preview attempts were intermittently rate-limited on the Hobby plan, but the exact merged production commit deployed successfully and reached `READY`. Post-deploy Vercel error/fatal inspection for the new production deployment returned no matching logs in the inspected window.

## Product contract

Pachimanga has no guest, demo, or anonymous reader mode.

- Supabase email/password authentication is mandatory for normal application use.
- Only auth flows and `/offline` are intentionally anonymous application paths.
- Library, progress, history, settings, imports, offline chapter downloads, and browser-local state belong to the signed-in user.
- Supabase RLS is the final database isolation boundary.
- Local IndexedDB/localStorage/outbox/cache state is bound to the active account and cleared/rebound across account changes.
- Authenticated responses remain private/non-shared-cacheable where expected.
- Mock providers/data are test/development support only and never a production fallback.
- Provider/relay refusals such as `403`/`429` are surfaced rather than bypassed.

## Current capabilities

- Registration, sign-in, confirmation resend, password recovery, signed-in password change, profile personalization, and secure sign-out.
- Account controls consolidated into Settings; `/account` remains a protected compatibility redirect to `/settings#account`.
- Reader settings, sync status, PWA/device controls, account export, diagnostics, and sign-out organized by user importance.
- Theme quick toggle in the main shell rather than a full Settings card.
- Personal Library status separate from provider publication status.
- Dynamic manga progress, deterministic rehydration, owner-bound progress/settings outboxes, explicit `Sync now`, and pending-sync retry.
- Continue Reading, unread chapter updates, Recently Updated, Library sorting/filtering, and live data-backed Updates.
- New readers start from the earliest available chapter; `Continue` is shown only when real progress exists.
- MangaDex reader integration.
- WeebCentral browser/PWA support through the locked-down relay when configured.
- ComicK metadata compatibility; public chapter-list `403` means it is not treated as a validated new-reader fallback.
- Bounded provider refresh behavior: duplicate refreshes are coalesced, very recent checks can be reused, provider refresh has a hard timeout, and oversized WeebCentral raw chapter HTML is not placed in the Next.js data cache.
- Conventional page and long-strip/manhwa reader layouts, progress/resume, navigation, auto-scroll, keyboard/touch controls, and optional Screen Wake Lock.
- Explicit account-bound offline chapter downloads, bounded PWA runtime cache, and explicit service-worker update lifecycle.
- OCR/image import, Tachiyomi/Mihon backup import, Tachimanga import, and validated JSON fallback.
- Optional browser E2E runner without Playwright in normal dependencies.

## Runtime architecture

```text
Browser / installed PWA
        |
        v
Next.js 16 App Router on Vercel
        |
        +--> Supabase Auth + Postgres/RLS
        +--> MangaDex / ComicK metadata paths
        +--> optional locked-down WeebCentral relay

Tauri 2 shell (source retained; distribution deferred)
        |
        v
same account model and production web UI
```

See `docs/architecture.md`, `docs/library-state.md`, `docs/reader-pwa-hardening.md`, and `docs/operations.md`.

## Remaining release-candidate evidence

Code hardening is no longer the primary blocker. Do not call the PWA a release candidate until real identities/devices provide evidence for:

- fresh registration, email confirmation, resend/rate-limit behavior, password recovery, and fresh login after password change;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device sync and near-simultaneous update behavior;
- installed PWA on iPhone, iPad, Android, and desktop Chromium;
- service-worker upgrade from an older installed version;
- physical-device conventional and long-strip reader testing;
- representative OCR/`.tachibk`/`.proto.gz`/`.tmb` imports using disposable samples;
- fresh post-deploy credential-free Production Smoke on the current production runtime from a network-capable environment.

## Local setup

Requirements: Node.js 22+, npm, and Supabase publishable project values.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell can use the repository launcher:

```powershell
.\start-local.ps1
```

Useful options:

```powershell
.\start-local.ps1 -Verify
.\start-local.ps1 -Install
.\start-local.ps1 -NoBrowser
.\start-local.ps1 -Port 3001
```

The launcher verifies Node.js 22+, checks required Supabase values in `.env.local`, installs dependencies with `npm ci` when needed (or when `-Install` is supplied), optionally runs the full quality gate with `-Verify`, starts the Next.js development server, and opens the local app when it becomes reachable.

Required browser-visible values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Optional server-only relay values:

```text
WEEBCENTRAL_RELAY_URL=
WEEBCENTRAL_RELAY_TOKEN=
```

Never commit service-role keys, relay tokens, session tokens, passwords, signing certificates, provisioning profiles, keystores, or private keys.

## Quality gate

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Equivalent:

```bash
npm run verify
```

Production smoke:

```bash
BASE_URL=https://pachimanga.frogilab.dev node ops/production-smoke.mjs
```

Native-impacting changes additionally require the checks documented in `AGENTS.md`/`NATIVE.md`; native distribution itself remains deferred.

## Documentation

Read new-session guidance in this order:

1. `AGENTS.md`
2. `docs/WORKPLAN.md`
3. `docs/verification-2026-09-17.md`
4. `docs/START-HERE-NEW-CHAT.md`
5. `docs/architecture.md`
6. `docs/operations.md`
7. `docs/library-state.md`
8. `docs/reader-pwa-hardening.md`
9. `docs/browser-e2e-performance.md`
10. `supabase/README.md`

Documentation index: `docs/README.md`.

## Distribution

The supported delivery target is the authenticated PWA at `https://pachimanga.frogilab.dev`.

Native source remains maintained for compatibility, but signing, stores, installers, TestFlight, desktop packaging, and native distribution remain blocked until the PWA release-candidate gate is satisfied.
