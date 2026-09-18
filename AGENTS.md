# AGENTS.md

This is the mandatory project contract for AI agents, Hermes, and new engineering sessions working on Pachimanga. It is intentionally strict. When a convenience conflicts with these rules, preserve the rule and choose a safer implementation.

## Required read order

Before substantive work, read:

1. `AGENTS.md` — this file.
2. `docs/WORKPLAN.md` — current priorities and acceptance criteria.
3. `docs/verification-release-2026-09-18.md` — latest release evidence and explicit gaps.
4. `docs/architecture.md` — runtime and security boundaries.
5. The relevant project-local skill in `.hermes/skills/`.
6. `docs/art-direction.md` for user-facing UI work.
7. `NATIVE.md` and `docs/native-release-pipeline.md` only for intentional native work.
8. `docs/free-pwa-distribution.md` for PWA/install/relay work.

Then verify current repository and production state. Never assume a previous chat, branch, deployment, or workplan snapshot is still current.

## Non-negotiable product contract

Pachimanga is a private account-based manga reader.

MUST remain true:

- Authentication is mandatory for normal application use.
- There is no guest, demo, anonymous reader, or production mock fallback.
- A user must never see another user's library, history, progress, settings, imports, or local cache state.
- Supabase Row Level Security remains enabled for account-owned data.
- Browser-local state is bound to the authenticated user and cleared/rebound on account changes.
- Authenticated responses remain private/non-shared-cacheable where expected.
- Web/PWA and native shells use the same account model.
- WeebCentral relay/native bridges remain source-specific and operation-limited.
- The client does not solve CAPTCHAs, rotate proxies, bypass authentication, defeat anti-bot controls, or generalize into an arbitrary fetch proxy.

Do not weaken these requirements to make a feature easier.

## Active delivery policy

PWA/web v0.4.0 is the released production product as of 2026-09-18. Vercel production from `main` remains the active delivery path.

Native source remains maintained for compatibility, but native packaging/signing/store distribution is a separate manually gated phase. The PWA release does not by itself authorize native distribution.

During the current phase:

- keep normal product work PWA/web first unless the user explicitly changes scope;
- Android debug/release, desktop release, and iOS release workflows stay manual-only;
- do not re-add tag/push triggers to native release workflows;
- do not begin signing, stores, installers, TestFlight, or desktop packaging without explicit user direction and native validation;
- preserve all auth/RLS/cache/provider security boundaries across post-release maintenance.

The release decision records product readiness accepted by the owner; it does not convert unobserved device/account/import checks into completed evidence.

## Hard stop conditions

Stop and resolve the problem before merge if any of these occur:

- merge-conflict markers exist anywhere in tracked project/config/documentation files;
- required tests, lint, typecheck, build, or relevant native checks fail;
- a change creates an auth bypass or anonymous application content path;
- a change weakens RLS or account scoping;
- a change risks cross-account local cache leakage;
- a source bridge accepts arbitrary caller-controlled URLs;
- a secret/private key/token appears in source, logs, fixtures, docs, or generated output;
- production behavior differs materially from documentation and the documentation is not corrected;
- a runtime change is about to merge without a green Vercel preview/build signal when one is available;
- the branch contains unrelated work that has not been understood.

Do not suppress the signal. Fix the cause or report the blocker.

## Forbidden shortcuts

Do not:

- commit directly to `main` for normal work;
- force-push or rewrite published history unless explicitly requested for recovery;
- merge knowingly failing CI;
- use broad ESLint/TypeScript disables to hide a defect;
- delete tests because they fail after a change;
- replace real error states with mock/demo content;
- rewrite already-applied Supabase migration history;
- disable RLS as a debugging shortcut;
- mutate production data/schema/auth settings merely because code changes were requested;
- deploy or create a release when the user asked only for code/documentation review;
- enable automatic native releases during the PWA phase;
- discard unrelated local changes;
- claim validation that was not actually run or observed.

A narrow, documented lint exception is acceptable only when the code is intentional, the rule is a false positive for that exact pattern, and the exception is scoped to the smallest possible file/rule surface.

## Session boot protocol

Before editing:

1. Read the required documents.
2. Check current `main` HEAD and recent relevant commits.
3. Check open PRs and the active work branch.
4. Inspect local working-tree status when a local checkout is available; preserve unrelated work.
5. For runtime/deployment work, check latest Vercel production and preview state.
6. For auth/data work, inspect current Supabase migrations/schema/advisors before mutation.
7. Reproduce a reported bug before changing code when practical.
8. State the exact scope you intend to change; do not silently broaden it.

If `main` moved after the work branch was created, compare/rebase/merge intentionally before opening or merging the PR.

## Git workflow

Use one active branch per coherent workstream.

Normal flow:

1. Start from current `main`.
2. Create one focused branch.
3. Make the complete coherent change there.
4. Run focused checks while iterating.
5. Run the required final gate.
6. Review the full diff for unrelated files, secrets, generated output, conflict markers, and accidental workflow changes.
7. Open one PR with scope + validation evidence.
8. Merge promptly when green.
9. Verify production for runtime-impacting changes.
10. Delete/retire stale temporary branches when tooling permits.

Do not create multiple branches for successive fragments of the same task. If the branch is still valid, continue using it.

## Definition of done

A task is not done merely because code was written.

Done means:

- requested behavior is implemented;
- required checks pass;
- relevant regression cases were verified;
- docs/workplan changed when architecture, operations, behavior, or priorities changed;
- the final diff is reviewed;
- PR/merge state is accurate;
- runtime changes are smoke-tested after deployment when requested/appropriate;
- remaining blockers are explicit and reproducible.

## Production architecture

Production UI:

```text
https://pachimanga.frogilab.dev
```

Main boundaries:

- Next.js 16 App Router frontend/API routes on Vercel
- Supabase Auth + Postgres/RLS for authenticated user data
- IndexedDB/localStorage as account-bound cache
- local-first progress/history outbox for reconnect retry
- MangaDex and ComicK integrations
- WeebCentral browser/PWA path through the optional locked-down private relay
- WeebCentral Tauri path through the Rust `weebcentral_request` command
- Tauri 2 shell loading the production UI
- GitHub Actions for web/native quality and manual native artifact builds

## Authentication invariants

Primary code:

- `src/proxy.ts`
- `src/lib/supabase/proxy.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/app/auth/**`

Only auth flows and `/offline` are intentionally anonymous application paths.

For any auth/session change, verify at minimum:

- anonymous `/`;
- anonymous `/browse`, `/import`, `/library`, `/history`, `/settings`;
- at least one protected API route;
- registration + confirmation;
- sign-in;
- sign-out;
- reset/recovery if touched;
- account switch on the same browser;
- private/no-store response behavior where expected.

Protected routes must not rely on client-side hiding alone.

## Data ownership and sync invariants

Synchronized tables currently include:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

All account-owned access must stay scoped to the authenticated user in both application queries and RLS policies.

`src/lib/storage/reader-storage.ts` binds local cache state to the current account. Progress/history writes are local-first and queued in an IndexedDB outbox before retrying Supabase. Do not assume all library/settings operations have identical offline semantics; verify the specific operation before documenting or changing it.

For sync changes, define:

- source of truth;
- conflict winner;
- timestamp semantics;
- offline behavior;
- reconnect behavior;
- account-switch behavior;
- duplicate/idempotency behavior.

## Supabase change rules

For schema/auth/data changes:

1. Read existing migrations first.
2. Create a new migration; never rewrite applied migration history.
3. Preserve RLS and unique/conflict targets used by application upserts.
4. Test locally/staging when possible.
5. Distinguish code authoring from production mutation.
6. Require explicit user intent before applying destructive or production mutations.
7. Re-run relevant Supabase security/performance advisors after production schema changes.

Known cleanup is tracked in `docs/WORKPLAN.md`; do not drop the constraint-backed library unique index instead of the redundant standalone index.

## Source integration rules

Provider-specific parsing/network behavior stays under `src/sources`, API routes, the relay, or the native bridge.

### WeebCentral

Two network paths are intentional:

- browser/PWA: private operation-limited relay when configured;
- Tauri native: device-side `weebcentral_request`.

Never turn either into an arbitrary URL proxy. Validate IDs/operations in trusted code, bound timeouts/redirects, and surface upstream 403/429/refusal states instead of bypassing them.

### MangaDex / ComicK

Keep their source adapters independent. Do not route them through the native WeebCentral bridge without a deliberate architecture change.

## Reader regression contract

Any material reader change must cover:

- conventional paged manga;
- long-strip/manhwa content at usable width;
- image loading/preload behavior;
- auto-scroll play/pause and elapsed-time behavior;
- wheel/touch/manual interaction pause behavior when relevant;
- progress restore/save;
- reload/reconnect behavior;
- background/suspend recovery without large jumps;
- keyboard/touch controls;
- reduced-motion behavior.

Do not reintroduce the known narrow long-strip regression.

## Import contract

Import paths include OCR/image review, Tachiyomi/Mihon backup formats, Tachimanga backup format, and JSON fallback.

Imported manga must resolve into the signed-in user's normal library path. Imports must not create a parallel anonymous library or silently fabricate provider matches.

Validate duplicate handling, malformed input, partial failure, user review, and account ownership when changing imports.

## PWA/service-worker contract

`public/sw.js` provides install/offline support. It must not cache authenticated application HTML as a reusable public shell.

Current intended behavior:

- navigation is network-first with `/offline` fallback;
- API requests are not service-worker cached;
- static Next.js assets and same-origin images may be cache-first;
- the public offline shell/icons are pre-cached;
- account-owned data remains behind normal auth/cache ownership boundaries.

PWA changes must be tested both in normal browser mode and installed/standalone mode where practical.

## Native security boundary

Tauri loads the production origin. Remote IPC remains restricted to the intended Pachimanga origin/capability configuration.

Treat as high-risk any native change that:

- widens allowed origins;
- accepts arbitrary URLs;
- adds filesystem/process/shell privileges;
- embeds secrets;
- changes signing/update behavior;
- changes remote-content trust boundaries.

Native distribution is deferred even though native source remains supported.

## Design and accessibility rules

For user-facing work, read `docs/art-direction.md` plus the relevant UI/design Hermes skills.

Minimum expectations:

- mobile-first responsive behavior;
- touch targets at least ~40px;
- visible focus states;
- semantic controls/labels;
- explicit loading/empty/error states;
- reduced-motion support;
- no decorative motion that disrupts reading;
- no copyrighted manga/franchise art;
- reuse shared components/tokens before introducing one-off styles.

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

Never commit secrets or signing material.

## Quality gates

Application/runtime changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Equivalent aggregate command:

```bash
npm run verify
```

Native-impacting changes additionally:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

Documentation/Hermes-only changes still require a diff review and repository hygiene validation; run `npm test` when dependencies are available because repository-hygiene tests are part of the suite.

Relevant CI:

- `.github/workflows/web-quality.yml`
- `.github/workflows/native-quality.yml`
- `.github/workflows/android-apk.yml` — manual
- `.github/workflows/android-release.yml` — manual
- `.github/workflows/desktop-release.yml` — manual
- `.github/workflows/ios-release.yml` — manual
- `.github/workflows/weebcentral-relay.yml`

When CI fails, inspect the failing job/log before editing unrelated code.

## Next.js version rule

This repository uses Next.js 16.3.3. Do not rely on remembered older Next.js behavior when changing framework APIs. Read the relevant installed Next.js documentation under `node_modules/next/dist/docs/` when available and heed current deprecations.

## Version invariant

Native version must stay consistent across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Run `node scripts/check-native-version.mjs` before native artifacts.

## Documentation maintenance

Keep these synchronized when their domains change:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/WORKPLAN.md`
- `docs/architecture.md`
- `docs/art-direction.md`
- `docs/free-pwa-distribution.md`
- `docs/hermes-local.md`
- `NATIVE.md`
- `docs/native-release-pipeline.md`
- relevant `.hermes/skills/**/SKILL.md`

`docs/WORKPLAN.md` is the operational backlog. Update completion evidence, blockers, and the exact next executable task instead of accumulating vague historical notes.

## Session closeout

Before ending substantive work, record or report:

```text
Branch / PR:
Main HEAD observed:
Files / behavior changed:
Checks actually run or observed:
Deployment status if relevant:
Known blockers / risks:
WORKPLAN items completed or changed:
Exact next task:
```

Never claim a task is merged, deployed, tested, or production-safe unless that state was verified.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
