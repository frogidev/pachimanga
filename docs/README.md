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

Historical verification files remain historical evidence. Always prefer the latest dated/current-state document and verify live infrastructure before making time-sensitive claims.

## Current snapshot — 2026-09-17

```text
main:       c9060fd177b7d3cdf607cbde1945af875e283fa7
production: dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA
state:      READY
runtime:    c9060fd177b7d3cdf607cbde1945af875e283fa7
```

PR #68 consolidated the remaining PWA test branch into `main`. The final PR head passed Repository Hygiene, Web Quality (install, tests, lint, typecheck, production build), and Production Smoke. Exact-head preview creation was affected by the Vercel Hobby build-rate limit, but the merged production commit deployed successfully and reached `READY`. Vercel error/fatal inspection for the exact production deployment was empty in the inspected post-deploy window.

Current implemented state also includes:

- Settings-integrated account/profile/security controls with protected `/account` compatibility redirect;
- confirmation resend, password recovery, signed-in password change, and sign-out that only clears local account state after successful Supabase sign-out;
- theme quick toggle in the app shell and sign-out as the final Settings action;
- account export, diagnostics, sync controls, and PWA/device state organized within Settings;
- first-read behavior that opens the earliest available chapter rather than the latest;
- shared visibility-aware sync-status observer using IndexedDB counts instead of hydrating queued payloads;
- bounded/coalesced library provider refreshes and a hard refresh timeout;
- WeebCentral parsed chapter caching that avoids Next.js raw-response cache failures for multi-megabyte chapter HTML.

## Source-of-truth ownership

| Area | Primary document | Runtime/code authority |
| --- | --- | --- |
| Engineering/security contract | `../AGENTS.md` | current code/live infrastructure |
| Current priorities | `WORKPLAN.md` | live GitHub/Vercel/Supabase state |
| Current evidence | `verification-2026-09-17.md` | live state + recorded evidence |
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
