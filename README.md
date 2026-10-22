# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a private, account-based manga reader built with Next.js 16 and Supabase. PWA/web v1.0.2 is the current released production line. Native distribution remains a separate manual phase and is not automatically enabled by the web release.

Production: `https://pachimanga.frogilab.dev`

## Repository baseline — audited 2026-10-22

The default branch `main` was observed at `23c6cf0`. The extension system, multi-language support, Spanish manga sources, local archive reader, reader spread mode, and library language filter were merged in PR #89 and deployed to production.

## Release state — 2026-10-22

Pachimanga v1.0.2 remains the current authenticated PWA/web release line. The PR #89 production line includes the extension system, multi-language support (English/Spanish), official Spanish sources (MangaPlus, Webtoon), local archive reader (CBZ/ZIP), reader spread/double-page mode, library language filter, and library search → browse integration.

## Post-release development

Pachimanga is in a feedback-driven improvement phase. Concrete user reports, screenshots, and reproducible friction are the primary product input. Clear and safe fixes are handled autonomously in focused batches, with regression coverage and concise handoff.

GitHub Actions is available. If quota/capacity becomes unavailable again, keep the missing signal explicit and never weaken protections to work around it.

When local validation is needed, owner-facing instructions are paste-ready PowerShell rooted at `F:\LF\pachimanga`.

See `docs/post-release-feedback.md`.

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

- Registration, sign-in, confirmation resend, password recovery, signed-in password change, profile personalization, visible avatar/display-name identity in desktop/mobile shell surfaces, and secure sign-out.
- Account controls consolidated into Settings; `/account` remains a protected compatibility redirect to `/settings#account`.
- Reader settings, sync status, PWA/device controls, account export, diagnostics, and sign-out organized by user importance.
- Theme quick toggle in the main shell rather than a full Settings card.
- **Multi-language support (English/Spanish)** with persistent locale selection.
- Personal Library status separate from provider publication status.
- Dynamic manga progress, deterministic rehydration, owner-bound progress/settings outboxes, explicit `Sync now`, and pending-sync retry.
- Continue Reading, unread chapter updates, Recently Updated, Library sorting/filtering, user collections, and live data-backed Updates.
- New readers start from the earliest available chapter; caught-up titles wait for new unread chapters instead of restarting, completed rereads remain marked complete, and finishing the newest unread chapter returns to manga detail.
- MangaDex reader integration.
- WeebCentral browser/PWA support through the locked-down relay when configured.
- ComicK metadata compatibility; public chapter-list `403` means it is not treated as a validated new-reader fallback.
- Bounded provider refresh behavior: duplicate refreshes are coalesced, very recent checks can be reused, provider refresh has a hard timeout, and oversized WeebCentral raw chapter HTML is not placed in the Next.js data cache.
- Conventional page and long-strip/manhwa reader layouts, progress/resume, navigation, auto-scroll, keyboard/touch controls, and optional Screen Wake Lock.
- **Reader spread/double-page mode** (auto/always/never) with landscape auto-detection for manga preset.
- Explicit account-bound offline chapter downloads with cancellation/quota guards, a Settings retry/remove manager, bounded PWA runtime cache, and explicit service-worker update lifecycle.
- **Local archive reader** (`/archive` route) for CBZ/ZIP files with thumbnail strip, keyboard/touch navigation, and fullscreen.
- OCR/image import, Tachiyomi/Mihon backup import, Tachimanga import, validated JSON fallback, versioned account backup/restore, and non-secret tracker-link restoration.
- **Library language filter** (EN, ES, JA, ZH, KO, FR, DE, PT, IT, RU, Other, All).
- **Library search → Browse integration**: when no results, prompt to browse live sources.
- Optional AniList/MyAnimeList tracking with device-local OAuth credentials and owner-RLS-protected tracker links.
- **Multi-language support (English/Spanish)** with persistent locale selection.
- **Official Spanish sources**: MangaPlus (Shueisha) and Webtoon (Naver) built-in.
- **Extension system**: user-installable extensions (zip + code), sandbox execution, registry, Settings UI, example Spanish aggregator templates.
- Explicit source migration/duplicate consolidation, account-scoped navigation-state restoration, reader presets, bounded provider concurrency, and optional browser E2E without Playwright in normal dependencies.

## Runtime architecture

```text
Browser / installed PWA
        |
        v
Next.js 16 App Router on Vercel
        |
        +--> Supabase Auth + Postgres/RLS
        +--> MangaDex / ComicK metadata paths
        +--> MangaPlus / Webtoon official APIs
        +--> optional locked-down WeebCentral relay

Tauri 2 shell (source retained; distribution deferred)
        |
        v
same account model and production web UI
```

See `docs/architecture.md`, `docs/library-state.md`, `docs/reader-pwa-hardening.md`, and `docs/operations.md`.

## Post-release validation backlog

The owner designated v1.0.2 as the current release line on 2026-09-19. That release decision does not fabricate manual evidence that was not collected. The following remain useful post-release validation targets and regression checks:

- fresh registration/email confirmation/recovery flows across real mail delivery;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device synchronization and near-simultaneous update behavior;
- installed PWA behavior on iPhone, iPad, Android, and desktop Chromium;
- service-worker upgrade from an older installed version;
- physical-device conventional and long-strip reader testing;
- representative OCR/`.tachibk`/`.proto.gz`/`.tmb` imports using disposable samples;
- repeat Production Smoke after future runtime-impacting merges; the repository owner reported the post-PR85 production smoke passed.
- extension installation from zip and code, toggle, settings;
- multi-language toggle (EN/ES) and persistence;
- Spanish sources (MangaPlus, Webtoon) search, chapters, pages;
- local archive reader (CBZ/ZIP) open, navigation, thumbnails, fullscreen;
- reader spread mode (auto/always/never) in portrait/landscape;
- library language filter and search→browse prompt.

These are post-release evidence/backlog items, not claims that the checks already passed.

## Local setup

Requirements: Node.js 22+, npm, network access for `npm ci`, and valid Supabase publishable project values. The `.env.example` values are **dummy placeholders**, not real credentials; configure a Supabase project with the required migration chain and RLS before sign-in can work. See [supabase/README.md](supabase/README.md).

To clone from scratch:

```bash
git clone https://github.com/frogidev/pachimanga.git
cd pachimanga
git switch main
git pull --ff-only origin main
```

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

Optional environment variables in `.env.local` (documented in `.env.example`):

- `NEXT_PUBLIC_ANILIST_CLIENT_ID` — AniList public OAuth application identifier.
- `NEXT_PUBLIC_MYANIMELIST_CLIENT_ID` — MyAnimeList public OAuth identifier.
- `MYANIMELIST_CLIENT_SECRET` — optional **server-only** secret for relevant MyAnimeList OAuth applications.

The configured OAuth application redirect paths are `/tracking/anilist/callback` and `/tracking/myanimelist/callback`.

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

## Git workflow and contributions

`main` is production-facing and protected by a GitHub ruleset requiring pull requests, squash merges, and `hygiene` and `quality` status checks. Use a short-lived `fix/`, `feat/`, `docs/` or `chore/` branch per coherent workstream. Begin from current `main`, run the full verification gate before runtime PRs, inspect diff/secrets/generated output, resolve review threads, then squash-merge after checks pass. Native workflows stay manual-only. Do not treat a stale squash-merged branch's ahead count as evidence of missing code.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and immediate prioritized backlog. `docs/WORKPLAN.md` remains the detailed operational plan.

## Documentation

Read new-session guidance in this order:

1. `AGENTS.md`
2. `docs/WORKPLAN.md`
3. `docs/verification-release-2026-09-20.md`
4. `docs/verification-release-2026-09-19.md` — historical pre-PR85 release record
5. `docs/verification-release-2026-09-18.md` — historical v0.4.0 record
6. `docs/post-release-feedback.md`
7. `docs/verification-2026-09-17.md`
8. `docs/START-HERE-NEW-CHAT.md`
8. `docs/architecture.md`
9. `docs/operations.md`
10. `docs/library-state.md`
10. `docs/reader-pwa-hardening.md`
11. `docs/browser-e2e-performance.md`
11. `supabase/README.md`

Documentation index: `docs/README.md`.

## File ownership and architecture

- `src/app`: Next.js 16 App Router pages, server endpoints and protected routing.
- `src/features`, `src/components`: React 19 and Tailwind CSS 4 UI.
- `src/lib/supabase`, `supabase/migrations`: Supabase authentication, PostgreSQL and row-level security.
- `src/lib/storage`, `src/lib/offline`, `public/sw.js`: account-bound IndexedDB/offline cache, outbox sync and PWA support.
- `src/sources`, `relay/weebcentral`: MangaDex, ComicK, MangaPlus, Webtoon and restricted WeebCentral network paths.
- `src/lib/imports`, `src/lib/tracking`: import formats and optional AniList/MyAnimeList.
- `src/lib/extensions`, `extensions/`: extension system (sandbox, registry, UI, templates).
- `src/lib/archive`: local archive reader (CBZ/ZIP).
- `src/lib/i18n`: multi-language support (English/Spanish).
- `src-tauri`: retained Rust/Tauri 2 shell, not automatically released.
- `.github/workflows`, `ops`: CI quality, controlled deployment and smoke checks.

## Distribution

The supported delivery target is the authenticated PWA at `https://pachimanga.frogilab.dev`.

Native source remains maintained for compatibility. Signing, stores, installers, TestFlight, desktop packaging, and native distribution remain manual-only and require a separate explicit user decision plus the native validation/security gates.