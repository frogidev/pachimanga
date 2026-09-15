# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a private, account-based manga reader built with Next.js, Supabase, and an optional Tauri 2 shell. It is local-first for reader responsiveness while library state, reading progress, history, and reader settings synchronize under the authenticated account.

Production: `https://pachimanga.frogilab.dev`

## Current delivery target

The production PWA/web app is the only active delivery target until the PWA release-candidate gate in `docs/WORKPLAN.md` is complete.

- Vercel deploys `main` automatically.
- Android, Windows, Linux, macOS, and iOS source remains in the repository.
- Native test/release workflows are manual-only during the PWA phase.
- Do not spend product time on platform packaging or distribution unless the workplan reaches the final native phase or the user explicitly changes priority.

## Product contract

Pachimanga has no guest, demo, or anonymous reader mode.

- Email/password authentication through Supabase is mandatory.
- Unauthenticated application routes resolve to the authentication experience.
- Only authentication flows and `/offline` are intentionally anonymous application paths.
- Library, progress, history, settings, imports, and local cache state belong to the signed-in user.
- Supabase Row Level Security is the final database isolation boundary.
- Browser-local caches are bound to the current account and cleared/rebound across account changes.
- Mock providers/data may support tests and local development but must not become a production fallback.

## Current capabilities

- Supabase email/password registration, login, confirmation, reset, and account-scoped data
- Per-user manga library and synchronized reading state
- Installable PWA for iPhone, iPad, Android, and desktop browsers
- MangaDex, ComicK, and WeebCentral integrations
- Locked-down private WeebCentral relay for browser/PWA use when configured
- Narrow device-side `weebcentral_request` bridge for Tauri builds
- Manga detail pages with chapter pagination and read-state controls
- Conventional page and long-strip/manhwa reader layouts
- Elapsed-time auto-scroll, progress restore/save, preload controls, and reduced-motion handling
- Local-first progress/history outbox that retries on reconnect
- OCR/image import with review
- Tachiyomi/Mihon backup import (`.tachibk`, `.proto.gz`)
- Tachimanga backup import (`.tmb`)
- JSON import fallback
- Offline fallback shell without caching authenticated application HTML as public content

## Runtime architecture

```text
Browser / installed PWA
        |
        v
Next.js 16 App Router on Vercel
        |
        +--> Supabase Auth + Postgres/RLS
        +--> MangaDex / ComicK
        +--> optional private WeebCentral relay

Tauri 2 shell
        |
        v
same production web UI
        |
        +--> same Supabase account model
        +--> dedicated native WeebCentral command
```

See `docs/architecture.md` for the detailed boundaries and data flow.

## Local setup

Requirements:

- Node.js 22+
- npm
- Supabase project values for authenticated development

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

Optional server-only WeebCentral relay values:

```text
WEEBCENTRAL_RELAY_URL=
WEEBCENTRAL_RELAY_TOKEN=
```

Never commit service-role keys, relay tokens, signing certificates, provisioning profiles, keystores, GPG keys, or passwords.

## Quality gate

For application changes, the default merge gate is:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Or:

```bash
npm run verify
```

Native-impacting changes additionally require:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

Do not hide, broadly disable, or route around a failing check. Fix the issue or document a verified pre-existing blocker.

## Documentation and agent guidance

AI/Hermes sessions must read `AGENTS.md` first and `docs/WORKPLAN.md` second.

Documentation index: `docs/README.md`.

Key documents:

- `AGENTS.md` — hard engineering/security/git/deployment contract
- `docs/WORKPLAN.md` — detailed execution plan and release gates
- `docs/architecture.md` — production architecture and invariants
- `docs/art-direction.md` — visual language and UI rules
- `docs/hermes-local.md` — Hermes setup and project-local skills
- `docs/free-pwa-distribution.md` — PWA and private relay operations
- `NATIVE.md` — retained Tauri runtime and native boundary
- `docs/native-release-pipeline.md` — deferred/manual native release procedures

## Distribution

Current supported delivery is the authenticated PWA at `https://pachimanga.frogilab.dev`.

Native distribution is intentionally deferred. When the PWA reaches release-candidate status, the final phase will validate signing, upgrade behavior, desktop packaging, Android artifacts, and the Apple/TestFlight decision before native distribution is treated as supported.

## Brand

Pachimanga uses a dark plum night-room visual system with coral/pink accents and Pachi, the original cat mascot. The canonical visual rules are in `docs/art-direction.md`; do not introduce copyrighted manga/franchise artwork.