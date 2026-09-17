# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a private, account-based manga reader built with Next.js, Supabase, and an optional Tauri 2 shell. The PWA/web app is the active product target; native distribution remains deferred until the PWA release-candidate gate is complete.

Production: `https://pachimanga.frogilab.dev`

## Current state — 2026-09-17

Observed repository state:

```text
main: ef67bc255134ec9bf033846bb8d062131195c715
```

Latest production runtime deployment:

```text
deployment: dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN
state:      READY
runtime:    605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6
```

`main` is newer because PR #52 contains tests/ops/docs only and is intentionally non-runtime.

User-operated local validation on current `main` passed:

- `npm ci`: 0 vulnerabilities;
- `npm run verify`: 94/94 tests passed, lint passed, typecheck passed, production build passed;
- production smoke: 9 protected routes + 4 PWA icons passed.

GitHub Actions capacity is unavailable for the remainder of the current month. Local verification + Vercel preview/build + production smoke/runtime inspection are the active evidence path; security and account-isolation controls must not be weakened as a workaround.

Latest dated evidence: `docs/verification-2026-09-17.md`.

## Product contract

Pachimanga has no guest, demo, or anonymous reader mode.

- Supabase email/password authentication is mandatory for normal application use.
- Only auth flows and `/offline` are intentionally anonymous application paths.
- Library, progress, history, settings, imports, offline chapter downloads, and browser-local cache state belong to the signed-in user.
- Supabase RLS is the final database isolation boundary.
- Local IndexedDB/localStorage/outbox/cache state is bound to the active account and cleared/rebound across account changes.
- Authenticated responses remain private/non-shared-cacheable where expected.
- Mock providers/data are test/development support only and never a production fallback.
- Provider/relay refusals such as `403`/`429` are surfaced rather than bypassed.

## Current capabilities

- Supabase registration, sign-in, confirmation, password recovery, and account-scoped data
- Personal Library status separate from provider publication status
- Dynamic manga progress from synchronized chapter progress
- Compact account-bound library progress summaries for large libraries
- Owner-bound progress/settings outboxes with reconnect retry and visible sync state
- Continue Reading, unread chapter updates, Recently Updated by chapter activity, multiple Library sorting/filtering modes
- MangaDex reader integration
- ComicK metadata compatibility; not currently treated as a validated new-reader source while public chapter-list access is unstable/blocked
- WeebCentral browser/PWA path through the locked-down private relay when configured
- Conventional page and long-strip/manhwa reader layouts
- Reader resume, auto-scroll, progress bar, page/chapter navigation, keyboard/touch controls, optional Screen Wake Lock
- Explicit account-bound offline chapter page downloads
- Explicit service-worker update prompt and user-controlled reload
- Bounded PWA runtime cache and conservative network-first authenticated navigation
- OCR/image import with review
- Tachiyomi/Mihon (`.tachibk`, `.proto.gz`) import
- Tachimanga (`.tmb`) import
- bounded/validated JSON import fallback
- optional browser E2E runner that does not add Playwright to normal project dependencies

## Runtime architecture

```text
Browser / installed PWA
        |
        v
Next.js 16 App Router on Vercel
        |
        +--> Supabase Auth + Postgres/RLS
        +--> MangaDex / ComicK metadata paths
        +--> optional private WeebCentral relay

Tauri 2 shell (retained, distribution deferred)
        |
        v
same production web UI
        |
        +--> same Supabase account model
        +--> dedicated native WeebCentral command
```

See `docs/architecture.md`, `docs/library-state.md`, and `docs/reader-pwa-hardening.md`.

## Pre-human-testing work still pending

Before freezing features and starting broader human testing, the current workplan calls for:

- safe Settings diagnostics + Copy diagnostics;
- explicit Sync now / retry pending sync;
- clearer provider/network/403/429/relay error UX with Retry;
- signed-in user JSON export without credentials/tokens/secrets;
- final accessibility/focus/keyboard/loading-empty-error responsive pass;
- manual per-title chapter refresh + useful last-checked indication.

These are planned, not yet shipped. See `docs/WORKPLAN.md`.

## Manual release evidence still required

- fresh registration/confirmation/password recovery;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device sync;
- installed-PWA testing on iPhone/iPad/Android/desktop;
- service-worker upgrade testing from an older installed build;
- real-device conventional + long-strip reader matrix;
- representative OCR/`.tachibk`/`.proto.gz`/`.tmb` import validation.

Do not claim PWA release-candidate status until these are evidenced.

## Local setup

Requirements:

- Node.js 22+
- npm
- Supabase publishable project values

```bash
npm install
cp .env.example .env.local
npm run dev
```

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

Primary application gate:

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

PowerShell:

```powershell
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\ops\production-smoke.mjs
```

Native-impacting changes additionally require the native checks documented in `AGENTS.md`/`NATIVE.md`; native distribution itself remains deferred.

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

Native source remains maintained for compatibility, but signing, stores, installers, TestFlight, desktop packaging, and native distribution are intentionally deferred until the PWA release-candidate gate is satisfied.
