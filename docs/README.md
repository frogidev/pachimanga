# Pachimanga documentation map

This directory is the durable project record for Pachimanga. Chat history is not a source of truth; current code/live state plus these documents are.

## Read order

For a new development session:

1. `../AGENTS.md`
2. `WORKPLAN.md`
3. `verification-release-2026-09-20.md`
4. `verification-release-2026-09-19.md` — historical pre-PR85 release record
5. `verification-release-2026-09-18.md` — historical v0.4.0 record
6. `post-release-feedback.md`
7. `verification-2026-09-17.md`
8. `START-HERE-NEW-CHAT.md`
9. `architecture.md`
10. `operations.md`
11. `library-state.md`
12. `reader-pwa-hardening.md`
13. `browser-e2e-performance.md`
14. `../supabase/README.md`
15. `vercel-build-policy.md`
16. `free-pwa-distribution.md`
17. `art-direction.md`
18. `hermes-local.md`
19. `../NATIVE.md` and `native-release-pipeline.md` only when native work is intentionally in scope.

Historical verification files remain historical evidence. Always prefer the latest dated/current-state document and verify live infrastructure before making time-sensitive claims.

## Current snapshot — 2026-09-20

Pachimanga v1.0.2 remains the current PWA/web release line. PR #85 is merged and deployed to production at `c48a057b30861b93124020822561eea7f7a9f8f4`; current Vercel/Supabase/validation evidence is recorded in `verification-release-2026-09-20.md`.

The PR #85 production baseline includes source migration, navigation-state restoration, reader presets, offline chapter management, bounded provider concurrency, optional AniList/MyAnimeList tracking, backup v2, and the caught-up/completed-reader fixes.

Manual real-device/account/import matrices remain post-release validation backlog and must not be represented as already observed.

## Source-of-truth ownership

| Area | Primary document | Runtime/code authority |
| --- | --- | --- |
| Engineering/security contract | `../AGENTS.md` | current code/live infrastructure |
| Current priorities | `WORKPLAN.md` | live GitHub/Vercel/Supabase state |
| Current evidence | `verification-release-2026-09-20.md` | live state + recorded evidence |
| New-chat handoff | `START-HERE-NEW-CHAT.md` | latest workplan/evidence |
| Post-release feedback workflow | `post-release-feedback.md` | feedback intake, autonomous execution, CI handling, PowerShell handoff |
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

## Documentation synchronization rule

Current-state documents must be synchronized whenever authentication, RLS/sync, account-bound cache ownership, source/relay behavior, service-worker/offline behavior, reader behavior, import behavior, deployment/validation strategy, release readiness, or active priorities materially change.

Historical dated verification records are not rewritten to pretend old evidence was collected later. Stable native/setup documents are reviewed for contradictions but remain unchanged when the PWA work does not alter their contract.
