# Pachimanga

**Your manga. Everywhere.**

Pachimanga is a private, account-based manga reader built with Next.js 16 and Supabase. PWA/web v0.4.0 is the released production product. Native distribution remains a separate manual phase and is not automatically enabled by the web release.

Production: `https://pachimanga.frogilab.dev`

## Release state — 2026-09-18

Pachimanga v0.4.0 is released on the authenticated PWA/web production path.

```text
release:    v0.4.0
release SHA:9e0cc7c379541db0d640ebe03383466c37d933ba
production: dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5
state:      READY
runtime:    9e0cc7c379541db0d640ebe03383466c37d933ba
```

The release includes the consolidated PWA integrity/scale work from PR #72, light-theme polish from PR #73, and visible account identity plus auth light-theme fixes from PR #74. The final PR #74 exact-head preview `dpl_46qhkopEh5HNFUyxNgBzA6P6djeZ` reached `READY`; the merged production deployment reached `READY` and Vercel returned no `error`/`fatal` runtime logs in the inspected post-deploy window.

The operator reported the final local `npm test`, lint, typecheck, and production build gate passing before merge. GitHub Actions capacity remains unavailable for the rest of September 2026, so missing hosted Action runs are not represented as passing evidence.

See `docs/verification-release-2026-09-18.md` for the release record and explicit evidence limits.

## Post-release development

Pachimanga is now in a feedback-driven improvement phase. Concrete user reports, screenshots, and reproducible friction should be treated as the primary product input. Clear and safe fixes should be handled autonomously in focused batches, with regression coverage and concise handoff.

GitHub Actions capacity is unavailable through September 30, 2026 and is expected to return October 1. Until then, use trustworthy local verification plus Vercel exact-head build evidence for runtime changes when available; never treat missing Actions as a pass or weaken protections to work around the outage.

When local validation is needed, owner-facing instructions should be paste-ready PowerShell rooted at `F:\LF\pachimanga`.

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
- Personal Library status separate from provider publication status.
- Dynamic manga progress, deterministic rehydration, owner-bound progress/settings outboxes, explicit `Sync now`, and pending-sync retry.
- Continue Reading, unread chapter updates, Recently Updated, Library sorting/filtering, user collections, and live data-backed Updates.
- New readers start from the earliest available chapter; `Continue` is shown only when real progress exists.
- MangaDex reader integration.
- WeebCentral browser/PWA support through the locked-down relay when configured.
- ComicK metadata compatibility; public chapter-list `403` means it is not treated as a validated new-reader fallback.
- Bounded provider refresh behavior: duplicate refreshes are coalesced, very recent checks can be reused, provider refresh has a hard timeout, and oversized WeebCentral raw chapter HTML is not placed in the Next.js data cache.
- Conventional page and long-strip/manhwa reader layouts, progress/resume, navigation, auto-scroll, keyboard/touch controls, and optional Screen Wake Lock.
- Explicit account-bound offline chapter downloads with cancellation/quota guards, bounded PWA runtime cache, and explicit service-worker update lifecycle.
- OCR/image import, Tachiyomi/Mihon backup import, Tachimanga import, validated JSON fallback, and account export/import round-trip support.
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

## Post-release validation backlog

The owner designated v0.4.0 as released on 2026-09-18. That release decision does not fabricate manual evidence that was not collected. The following remain useful post-release validation targets and regression checks:

- fresh registration/email confirmation/recovery flows across real mail delivery;
- same-browser Account A -> B -> A isolation;
- same-account two-session/two-device synchronization and near-simultaneous update behavior;
- installed PWA behavior on iPhone, iPad, Android, and desktop Chromium;
- service-worker upgrade from an older installed version;
- physical-device conventional and long-strip reader testing;
- representative OCR/`.tachibk`/`.proto.gz`/`.tmb` imports using disposable samples;
- a fresh credential-free Production Smoke against the exact v0.4.0 production runtime when a network-capable environment is available.

These are post-release evidence/backlog items, not claims that the checks already passed.

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
3. `docs/verification-release-2026-09-18.md`
4. `docs/post-release-feedback.md`
5. `docs/verification-2026-09-17.md`
6. `docs/START-HERE-NEW-CHAT.md`
7. `docs/architecture.md`
8. `docs/operations.md`
9. `docs/library-state.md`
10. `docs/reader-pwa-hardening.md`
11. `docs/browser-e2e-performance.md`
12. `supabase/README.md`

Documentation index: `docs/README.md`.

## Distribution

The supported delivery target is the authenticated PWA at `https://pachimanga.frogilab.dev`.

Native source remains maintained for compatibility. Signing, stores, installers, TestFlight, desktop packaging, and native distribution remain manual-only and require a separate explicit user decision plus the native validation/security gates.
