# Pachimanga documentation map

This directory is the durable project record for Pachimanga. Keep it synchronized with the code and with `AGENTS.md`; do not use chat history as the only source of truth.

## Read order

For a new development or Hermes session, read in this order:

1. `../AGENTS.md` — non-negotiable engineering, security, git, validation, and deployment rules.
2. `WORKPLAN.md` — current priorities, sequencing, acceptance criteria, and exact next work.
3. `architecture.md` — production runtime, authentication, storage, synchronization, source, PWA, native, and deployment boundaries.
4. `verification-2026-09-15.md` — dated production/CI/Supabase verification evidence and current external blockers.
5. `../supabase/README.md` — production migration provenance, historical repository SQL caveats, and safe schema-change workflow.
6. `vercel-build-policy.md` — hosted-runtime path detection and ignored-build behavior.
7. `art-direction.md` — visual language and UI consistency rules.
8. `free-pwa-distribution.md` — current PWA distribution and private WeebCentral relay model.
9. `hermes-local.md` — Hermes setup, project-local skills, and expected operating protocol.
10. `../NATIVE.md` and `native-release-pipeline.md` only when native code, signing, packaging, or distribution is intentionally in scope.

## Source-of-truth ownership

| Area | Primary document | Code that wins when documentation conflicts |
| --- | --- | --- |
| Product/auth contract | `../AGENTS.md` | `src/proxy.ts`, `src/lib/supabase/**`, Supabase migrations |
| Current priorities | `WORKPLAN.md` | Current GitHub/Vercel/Supabase state after verification |
| Runtime/data architecture | `architecture.md` | `src/**`, `src-tauri/**`, `relay/**`, `supabase/**` |
| Supabase migration provenance | `../supabase/README.md` | Live production migration history and schema |
| Dated verification evidence | `verification-2026-09-15.md` | Live GitHub/Vercel/Supabase state |
| Vercel build policy | `vercel-build-policy.md` | `vercel.json`, Vercel project settings, Web Quality paths |
| UI/visual language | `art-direction.md` | Shared components and `src/app/globals.css` |
| PWA distribution/relay | `free-pwa-distribution.md` | Vercel config, relay code, service worker |
| Hermes behavior | `hermes-local.md`, `.hermes/skills/**` | Root `AGENTS.md` remains the project contract |
| Native runtime | `../NATIVE.md` | `src-tauri/**` |
| Native releases | `native-release-pipeline.md` | `.github/workflows/*release.yml` |

When code and documentation disagree, verify current runtime behavior, correct the documentation in the same change, and do not preserve known-stale prose for historical reasons.

## Active delivery policy

The PWA/web product is the only active delivery target until the PWA release-candidate gate in `WORKPLAN.md` is satisfied. Native source remains maintained, but Android/desktop/iOS build and release workflows remain manual-only and platform distribution is deferred to the final phase.

## Documentation update rule

A change is incomplete when it materially changes any of the following without updating the corresponding documentation:

- authentication or anonymous-route behavior;
- Supabase schema, RLS, synchronization, or local cache ownership;
- source/provider behavior or relay/native network boundaries;
- PWA caching/install/offline semantics;
- reader behavior or regression expectations;
- deployment/CI/release behavior;
- native capabilities, signing, or packaging;
- visual system or shared interaction patterns;
- project priorities, blockers, or release readiness.

`WORKPLAN.md` is operational rather than historical. Remove completed noise, record evidence for completed gates, and keep the next executable tasks explicit. Dated verification files provide evidence snapshots but must not be treated as live state indefinitely.
