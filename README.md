# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a private, account-based manga reader built with Next.js, Supabase, and an optional Tauri native shell. It is local-first for responsiveness, but library data, reading progress, history, and reader settings are synchronized under the signed-in user's account.

Production: `https://pachimanga.frogilab.dev`

## Access model

Pachimanga has no guest, demo, or anonymous reader mode.

- Email/password login or registration is mandatory.
- Unauthenticated application routes are redirected to `/auth`.
- The only intentionally public application pages are authentication flows and the offline fallback.
- Library data, progress, history, settings, and imports belong to the authenticated user.
- Supabase Row Level Security is the final database isolation boundary.
- Browser-local caches are rebound to the current account and cleared when account ownership changes.

Mock source/data code can remain for tests or development, but it must never be exposed as a user-facing demo experience.

## Features

- Mandatory Supabase email/password authentication
- Per-user manga library with cloud synchronization
- Per-user reading progress, history, and reader preferences
- Installable PWA for iPhone, iPad, Android, and desktop browsers
- MangaDex and ComicK source integrations
- WeebCentral integration through either a locked-down private relay on web/PWA or a narrow on-device Tauri bridge in native builds
- Screenshot/image OCR import with review before matching
- Tachiyomi / Mihon backup import (`.tachibk`, `.proto.gz`)
- Tachimanga backup import (`.tmb`)
- JSON import fallback
- Long-strip/manhwa reader with auto-scroll and account-synced progress
- Tauri 2 native shell for Android and future desktop/iOS distribution

## Runtime architecture

The hosted UI is a Next.js App Router application deployed to Vercel. Supabase provides authentication and private per-user data. The browser/PWA can optionally use the Frogilab WeebCentral relay. Tauri builds load the same production UI and expose only the dedicated `weebcentral_request` native command to the production origin.

See [`docs/architecture.md`](docs/architecture.md) for the current boundaries and data flow.

## Local setup

Requirements:

- Node.js 22+
- npm
- Supabase project values for authenticated app development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Optional server-only WeebCentral relay values:

```text
WEEBCENTRAL_RELAY_URL=
WEEBCENTRAL_RELAY_TOKEN=
```

Never commit service-role keys, relay tokens, signing certificates, provisioning profiles, or private keys.

## Quality checks

Before merging application changes, run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run verify` runs the same web checks in sequence. Native changes should also pass:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

GitHub Actions also contains separate web and native quality workflows.

## Distribution

For a small private group, the current practical distribution model is:

- Web/PWA: production URL, account required
- Android: direct signed APK when release signing is configured
- Windows/Linux: direct desktop packages from the native release workflow
- macOS: direct package, ideally Developer ID signed/notarized if an Apple Developer membership is used
- iPhone/iPad: PWA at zero Apple cost, or TestFlight once Apple Developer distribution is enabled

See [`docs/free-pwa-distribution.md`](docs/free-pwa-distribution.md), [`NATIVE.md`](NATIVE.md), and [`docs/native-release-pipeline.md`](docs/native-release-pipeline.md).

## Repository guidance

AI agents and future development sessions should read [`AGENTS.md`](AGENTS.md) first, then [`docs/WORKPLAN.md`](docs/WORKPLAN.md).

Important project documentation:

- [`AGENTS.md`](AGENTS.md) — engineering invariants and handoff instructions
- [`docs/WORKPLAN.md`](docs/WORKPLAN.md) — current priorities and next-session checklist
- [`docs/architecture.md`](docs/architecture.md) — current runtime, auth, storage, source, and deployment architecture
- [`NATIVE.md`](NATIVE.md) — Tauri/native bridge model
- [`docs/native-release-pipeline.md`](docs/native-release-pipeline.md) — native release workflows and signing
- [`docs/free-pwa-distribution.md`](docs/free-pwa-distribution.md) — PWA plus private WeebCentral relay

## Brand

Pachimanga uses a dark plum + coral-pink visual system with Pachi, the cat mascot, for onboarding, empty states, install surfaces, and account flows.
