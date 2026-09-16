# Pachimanga documentation map

This directory is the durable project record for Pachimanga. Keep it synchronized with code and `AGENTS.md`; chat history must not be the only source of truth.

## Read order

For a new development or Hermes session, read in this order:

1. `../AGENTS.md` — non-negotiable engineering, security, git, validation, and deployment rules.
2. `WORKPLAN.md` — current priorities, sequencing, acceptance criteria, and exact next work.
3. `verification-2026-09-16.md` — latest dated GitHub/Vercel/Supabase/relay evidence and current deployment gap.
4. `START-HERE-NEW-CHAT.md` — copy/paste handoff prompt for a fresh ChatGPT session.
5. `architecture.md` — production runtime, authentication, storage, synchronization, source, PWA, native, and deployment boundaries.
6. `operations.md` — post-deploy checks, Vercel/relay/Supabase triage, incident flow, and manual-only boundaries.
7. `../supabase/README.md` — canonical production migration chain, RLS/grants, and safe schema-change workflow.
8. `library-state.md` — personal reading status, dynamic manga progress, publication status, and provider chapter-update semantics.
9. `vercel-build-policy.md` — hosted-runtime path detection, ignored-build behavior, and the current empty-previous-SHA failure mode.
10. `art-direction.md` — visual language and UI consistency rules.
11. `free-pwa-distribution.md` — current PWA distribution and private WeebCentral relay model.
12. `hermes-local.md` — Hermes setup, project-local skills, and expected operating protocol.
13. `../NATIVE.md` and `native-release-pipeline.md` only when native code, signing, packaging, or distribution is intentionally in scope.

Older dated verification files are historical evidence. Always prefer the latest dated snapshot, then verify live state before making time-sensitive claims.

## Source-of-truth ownership

| Area | Primary document | Code/live state that wins when documentation conflicts |
| --- | --- | --- |
| Product/auth contract | `../AGENTS.md` | `src/proxy.ts`, `src/lib/supabase/**`, Supabase migrations |
| Current priorities | `WORKPLAN.md` | Current GitHub/Vercel/Supabase/relay state after verification |
| Latest evidence | `verification-2026-09-16.md` | Live GitHub/Vercel/Supabase/relay state |
| New-chat handoff | `START-HERE-NEW-CHAT.md` | Latest workplan + live state verification |
| Runtime/data architecture | `architecture.md` | `src/**`, `src-tauri/**`, `relay/**`, `supabase/**` |
| Library state/progress | `library-state.md` | `src/features/library/**`, `src/lib/library/**`, `src/lib/storage/**`, `library_entries`, `reading_progress` |
| Production operations | `operations.md` | Live GitHub/Vercel/Supabase/relay state |
| Supabase migration provenance | `../supabase/README.md` | Live production migration history and schema |
| Vercel build policy | `vercel-build-policy.md` | `vercel.json`, Vercel project settings, Web Quality paths |
| UI/visual language | `art-direction.md` | Shared components and `src/app/globals.css` |
| PWA distribution/relay | `free-pwa-distribution.md` | Vercel config, relay code, service worker |
| Hermes behavior | `hermes-local.md`, `.hermes/skills/**` | Root `AGENTS.md` remains the project contract |
| Native runtime | `../NATIVE.md` | `src-tauri/**` |
| Native releases | `native-release-pipeline.md` | `.github/workflows/*release.yml` |

When code and documentation disagree, verify current runtime behavior and correct the documentation in the same change.

## Active delivery policy

PWA/web is the only active delivery target until the PWA release-candidate gate in `WORKPLAN.md` is satisfied. Native source remains maintained, but Android/desktop/iOS artifact and release workflows remain manual-only and platform distribution is deferred to the final phase.

## Current handoff summary

As of the 2026-09-16 snapshot:

- GitHub merge protection is complete and requires `hygiene` + `quality`.
- Supabase migration provenance, least-privilege grants, RLS, and stale-write guards are reconciled.
- Progress and reader-settings sync use owner-bound outboxes.
- Provider/import/reader hardening through PR #42 is merged.
- The homelab WeebCentral relay was redeployed through Portainer and observed healthy.
- The highest-priority technical issue is that Vercel production is behind current `main`; the ignored-build command can fail with `fatal: bad revision ''` when `VERCEL_GIT_PREVIOUS_SHA` is empty.
- Real-account auth/account-isolation/two-device checks and real installed-PWA device checks remain manual release evidence.

## Documentation update rule

A change is incomplete when it materially changes authentication, Supabase/RLS/sync, account-bound cache ownership, source/relay/native network boundaries, PWA caching/install behavior, reader behavior, import behavior, deployment/CI/release behavior, native packaging, visual rules, project priorities, blockers, or release readiness without updating the corresponding documentation.

`WORKPLAN.md` is operational rather than historical. Remove completed noise, keep only useful evidence, and make the next executable tasks explicit. Dated verification files preserve evidence snapshots but must never be treated as live state indefinitely.
