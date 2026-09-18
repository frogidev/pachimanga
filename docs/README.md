# Pachimanga documentation map

This directory is the durable project record for Pachimanga. Chat history is not a source of truth; current code/live state plus these documents are.

## Read order

For a new development session:

1. `../AGENTS.md`
2. `WORKPLAN.md`
3. `verification-release-2026-09-18.md`
4. `verification-2026-09-17.md`
5. `START-HERE-NEW-CHAT.md`
6. `architecture.md`
7. `operations.md`
8. `library-state.md`
9. `reader-pwa-hardening.md`
10. `browser-e2e-performance.md`
11. `../supabase/README.md`
12. `vercel-build-policy.md`
13. `free-pwa-distribution.md`
14. `art-direction.md`
15. `hermes-local.md`
16. `../NATIVE.md` and `native-release-pipeline.md` only when native work is intentionally in scope.

Historical verification files remain historical evidence. Always prefer the latest dated/current-state document and verify live infrastructure before making time-sensitive claims.

## Current snapshot — 2026-09-18

```text
release:    v0.4.0
main:       9e0cc7c379541db0d640ebe03383466c37d933ba
production: dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5
state:      READY
runtime:    9e0cc7c379541db0d640ebe03383466c37d933ba
```

The owner designated v0.4.0 as the PWA/web release after the final local quality gate passed on the PR #74 branch. Exact-head Vercel preview `dpl_46qhkopEh5HNFUyxNgBzA6P6djeZ` reached `READY`; PR #74 merged to `main`; the exact merged runtime reached production `READY`; and the inspected production `error`/`fatal` window was empty.

Release functionality includes PR #72 integrity/scale/sync/library features, PR #73 light-theme polish, and PR #74 visible avatar/display-name account identity plus light-auth contrast/autofill fixes. Historical verification files remain unchanged; use `verification-release-2026-09-18.md` for the release record.

Manual real-device/account/import matrices remain post-release validation backlog and must not be represented as already observed.

## Source-of-truth ownership

| Area | Primary document | Runtime/code authority |
| --- | --- | --- |
| Engineering/security contract | `../AGENTS.md` | current code/live infrastructure |
| Current priorities | `WORKPLAN.md` | live GitHub/Vercel/Supabase state |
| Current evidence | `verification-release-2026-09-18.md` | live state + recorded evidence |
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

## Documentation synchronization rule

Current-state documents must be synchronized whenever authentication, RLS/sync, account-bound cache ownership, source/relay behavior, service-worker/offline behavior, reader behavior, import behavior, deployment/validation strategy, release readiness, or active priorities materially change.

Historical dated verification records are not rewritten to pretend old evidence was collected later. Stable native/setup documents are reviewed for contradictions but remain unchanged when the PWA work does not alter their contract.
