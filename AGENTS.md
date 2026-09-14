# AGENTS.md

This file is the handoff entrypoint for AI agents and new development sessions working on Pachimanga.

Before making changes, read:

1. `README.md`
2. `docs/architecture.md`
3. `docs/WORKPLAN.md`
4. `NATIVE.md` when touching Tauri/mobile/desktop behavior
5. `docs/native-release-pipeline.md` when touching release workflows/signing
6. `docs/free-pwa-distribution.md` when touching the web/PWA WeebCentral relay

Always verify the current `main` HEAD, open pull requests, and production deployment status before assuming this document is the newest state.

## Product contract

Pachimanga is a private account-based manga reader. The following are product requirements, not optional implementation details:

- Login or registration is mandatory.
- There is no guest, demo, or anonymous reader mode.
- A user must not see another user's library, history, progress, settings, or imported state.
- Supabase Row Level Security remains enabled for user-owned data.
- Local cache ownership must follow the authenticated user.
- Mock data/providers may exist for tests/development, but must not become a public preview experience.
- Web/PWA and native builds use the same production account model.

Do not weaken these requirements to simplify a feature.

## Production architecture

Production UI:

```text
https://pachimanga.frogilab.dev
```

Main components:

- Next.js App Router frontend/API routes on Vercel
- Supabase Auth + Postgres for authenticated user data
- IndexedDB/localStorage as account-bound local cache
- MangaDex and ComicK integrations
- WeebCentral web/PWA path through an optional locked-down private relay
- WeebCentral native path through the Tauri Rust command `weebcentral_request`
- Tauri 2 shell loading the remote production frontend
- GitHub Actions for quality and native release builds

## Authentication invariants

Route/session enforcement lives around:

- `src/proxy.ts`
- `src/lib/supabase/proxy.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/app/auth/...`

Only auth flows and `/offline` are intentionally anonymous application paths. Protected routes should not rely on client-side redirects alone.

Authenticated responses should remain private/non-shared-cacheable.

When changing auth:

- test an incognito/anonymous request to `/`;
- test `/browse`, `/import`, `/library`, and at least one protected API route;
- verify they do not expose application content without a valid session;
- verify login/register/confirmation/reset flows still work;
- verify logout clears/rebinds local user cache correctly.

## Data ownership invariants

Current synchronized tables include:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

All user-owned access must remain scoped to `auth.uid()`/the authenticated user's ID through RLS and normal query predicates.

Local cache code is in `src/lib/storage`. `reader-storage.ts` binds IndexedDB/localStorage state to the current account. Do not remove that cache-owner boundary without replacing it with an equivalent or stronger isolation mechanism.

## Source integration rules

Provider-specific parsing/network behavior belongs under `src/sources` or the dedicated relay/native bridge.

### WeebCentral

There are two intentionally different network paths:

- web/PWA: private operation-limited relay;
- Tauri native: device-side `weebcentral_request` Rust command.

Never generalize either path into an arbitrary URL proxy/fetch bridge.

Do not implement CAPTCHA solving, credential bypass, proxy rotation, anti-bot bypass, or similar circumvention. Surface upstream refusal/status to the UI.

### MangaDex / ComicK

Keep these independent of the native WeebCentral bridge unless there is a specific architectural reason to change them.

## Reader regression cases

Any material reader-layout change should cover at least:

- conventional page manga;
- vertical long-strip/manhwa;
- auto-scroll play/pause and elapsed-time behavior;
- restoring/saving progress for an authenticated account;
- background/suspend recovery without large scroll jumps.

Do not reintroduce the narrow long-strip rendering regression.

## Imports

Import paths include OCR/image review, Tachiyomi/Mihon backup formats, Tachimanga backup format, and JSON fallback.

Imported manga must end up in the signed-in user's library. Import code should not create a separate anonymous/local library that bypasses the normal account model.

## Native security boundary

The Tauri shell loads the production remote UI. Remote IPC must remain restricted to the Pachimanga production origin/capability configuration.

`weebcentral_request` is the dedicated custom bridge. A native change is higher-risk if it:

- widens allowed origins;
- accepts caller-controlled arbitrary URLs;
- adds filesystem/process/shell capabilities;
- adds new secrets to the binary;
- changes signing/update behavior.

Review such changes explicitly.

## Local development

Node.js 22+ is required.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required browser-visible Supabase values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Optional server-only relay values:

```text
WEEBCENTRAL_RELAY_URL=
WEEBCENTRAL_RELAY_TOKEN=
```

Never commit service-role keys, relay tokens, Android keystores, Apple certificates/profiles, Windows signing certificates, GPG private keys, or passwords.

## Quality gates

For web/application changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

For native-impacting changes also run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

Relevant CI workflows:

- `.github/workflows/web-quality.yml`
- `.github/workflows/native-quality.yml`
- `.github/workflows/android-apk.yml`
- `.github/workflows/android-release.yml`
- `.github/workflows/desktop-release.yml`
- `.github/workflows/ios-release.yml`

When a workflow fails, inspect the failing job/logs before changing unrelated code.

## Versioning

Native version must match in:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Do not tag a native release until `scripts/check-native-version.mjs` passes.

## Git workflow

Default approach for non-trivial changes:

1. Fetch current `main` and open PR state.
2. Create a focused branch.
3. Make the smallest coherent change.
4. Run/observe relevant quality gates.
5. Open a PR with test/validation notes.
6. Merge only after the branch is green and deployment implications are understood.
7. Verify production after merges that affect runtime behavior.

Do not assume a previously discussed branch/PR still exists or is still current.

## Documentation maintenance

Update documentation when architecture, auth, deployment, release, or source boundaries change. At minimum keep these synchronized:

- `README.md`
- `docs/architecture.md`
- `AGENTS.md`
- `docs/WORKPLAN.md`
- `NATIVE.md` for native changes

`docs/WORKPLAN.md` is intentionally operational. Mark completed work, record blockers, and leave the next session with concrete verification steps instead of only broad goals.

## New-session start checklist

A new agent/session should begin by:

1. Reading this file and `docs/WORKPLAN.md`.
2. Checking `main` HEAD and recent commits.
3. Checking open PRs and active branches relevant to the workplan.
4. Checking latest Vercel production deployment when runtime work is planned.
5. Checking Supabase schema/migrations before any data/auth change.
6. Reproducing the current issue before editing code when fixing a bug.
7. Updating the workplan before ending the session.
