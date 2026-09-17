# Pachimanga documentation map

This directory is the durable project record for Pachimanga. Chat history is not a source of truth; current code/live state plus these documents are.

## Read order

For a new development session:

1. `../AGENTS.md`
2. `WORKPLAN.md`
3. `verification-2026-09-17.md`
4. `START-HERE-NEW-CHAT.md`
5. `architecture.md`
6. `operations.md`
7. `library-state.md`
8. `reader-pwa-hardening.md`
9. `browser-e2e-performance.md`
10. `../supabase/README.md`
11. `vercel-build-policy.md`
12. `free-pwa-distribution.md`
13. `art-direction.md`
14. `hermes-local.md`
15. `../NATIVE.md` and `native-release-pipeline.md` only when native work is intentionally in scope.

Historical verification files remain valid historical evidence. Always prefer the latest dated snapshot, then verify live state again.

## Current snapshot

As of 2026-09-17:

- observed `main`: `ef67bc255134ec9bf033846bb8d062131195c715`;
- latest production runtime: `605c72316115d7cb2e1f1ab6f66d7f2b9aaa02a6`;
- production deployment: `dpl_4RvYB1PgobgHL2ccMuEohKn5JiVN`, `READY`;
- current `main` is newer only by tests/ops/docs from PR #52;
- local user-operated `npm run verify` passed 94/94 tests, lint, typecheck, and production build;
- user-operated production smoke passed all 9 protected routes and 4 PWA icons;
- GitHub Actions capacity is unavailable for the remainder of this month, so current validation uses local quality checks + Vercel + production smoke/log inspection;
- PWA/library/reader hardening through PR #52 is merged;
- pre-human-testing diagnostics/sync-retry/export/error-UX/accessibility/manual-refresh work remains planned and is not yet shipped;
- real-account/two-device/installed-PWA/representative-import evidence remains manual.

## Source-of-truth ownership

| Area | Primary document | Runtime/code authority |
| --- | --- | --- |
| Engineering/security contract | `../AGENTS.md` | current code/live infrastructure |
| Current priorities | `WORKPLAN.md` | live GitHub/Vercel/Supabase state |
| Current evidence | `verification-2026-09-17.md` | live state + recorded local evidence |
| New-chat handoff | `START-HERE-NEW-CHAT.md` | latest workplan/evidence |
| Runtime architecture | `architecture.md` | `src/**`, `public/sw.js`, `relay/**`, `supabase/**` |
| Library/progress semantics | `library-state.md` | storage/library code + Supabase schema |
| Reader/PWA boundaries | `reader-pwa-hardening.md` | reader components + service worker/cache ownership |
| Browser/performance validation | `browser-e2e-performance.md` | tests/ops scripts + current operating environment |
| Production operations | `operations.md` | live Vercel/Supabase/relay state |
| Vercel build policy | `vercel-build-policy.md` | `vercel.json` + ignored-build helper |
| Supabase migrations/RLS/grants | `../supabase/README.md` | production schema/migration history |
| Visual system | `art-direction.md` | shared components/styles |
| PWA/relay distribution | `free-pwa-distribution.md` | Vercel + service worker + relay |
| Native runtime | `../NATIVE.md` | `src-tauri/**` |
| Native release process | `native-release-pipeline.md` | manual release workflows |

## Documentation reviewed in this synchronization

Current-state documents were synchronized to the 2026-09-17 handoff. Historical verification snapshots (`verification-2026-09-15.md`, `verification-2026-09-16.md`) remain intentionally unchanged. `art-direction.md`, `hermes-local.md`, `NATIVE.md`, and `native-release-pipeline.md` describe stable contracts/setup and do not require status rewriting merely because the PWA handoff advanced.

## Documentation update rule

Any material change to authentication, RLS/sync, account-bound cache ownership, source/relay boundaries, service-worker/offline behavior, reader behavior, import behavior, deployment/validation strategy, release readiness, or active priorities must update the corresponding document in the same workstream.
