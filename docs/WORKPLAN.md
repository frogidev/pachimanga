# Pachimanga continuation workplan

This is the operational handoff for the next development session. Always verify current GitHub, Vercel, and Supabase state before acting on time-sensitive notes.

## Current direction

PWA/web is the only active delivery target until the product is polished and production-ready.

- Production UI: `https://pachimanga.frogilab.dev`
- Vercel `main` deployments remain automatic.
- Mandatory Supabase authentication remains required.
- No guest/demo mode.
- User library, history, progress, settings, imports, and local cache remain account-scoped.
- Browser/PWA WeebCentral continues through the locked-down private relay when configured.
- Native/Tauri code is retained, but Android, desktop, and iOS deployment work is deferred until the final release phase.
- Native build/release workflows must remain manual-only while PWA work is active.

## Working model

Keep repository history simple:

1. Start from current `main`.
2. Create one focused branch only when changes need validation.
3. Apply the complete coherent change on that branch.
4. Run the relevant checks.
5. Merge into `main` promptly when green.
6. Delete stale/merged branches.
7. Do not keep parallel feature branches for the same workstream.

## P0 — production account validation

- [ ] Verify `https://pachimanga.frogilab.dev/auth/confirm` is allowed in Supabase Auth redirect configuration.
- [ ] Register and confirm a fresh production account.
- [ ] Verify sign-in, sign-out, and password reset.
- [ ] Confirm protected pages and APIs expose no app content anonymously.
- [ ] Confirm authenticated responses remain private/no-store where expected.
- [ ] Verify logout/account switching does not leak previous local state.
- [ ] Verify same-account sync across two browser/PWA devices.

## P0 — PWA product polish

- [ ] Audit mobile and desktop responsive layouts.
- [ ] Clean up navigation, spacing, typography, empty/error/loading states, and install UX.
- [ ] Verify standalone PWA launch and service-worker update behavior.
- [ ] Verify Library, Browse, Import, History, Settings, manga detail, and Reader flows on real mobile browsers.
- [ ] Re-test conventional manga and long-strip/manhwa reader layouts.
- [ ] Keep manga/source errors explicit; never fall back to mock/demo content.

## P0 — Supabase cleanup

Current advisor verification confirmed `public.library_entries` has duplicate unique indexes on `(user_id, source_id, manga_id)`.

- Keep `library_entries_user_id_source_id_manga_id_key` because it backs the table unique constraint.
- Drop only redundant standalone index `library_entries_user_source_manga_idx` through a migration.
- Re-run performance/security advisors afterward.
- Verify library upsert behavior after the migration.
- Review whether leaked-password protection should be enabled before broader user onboarding.

## P1 — synchronization and reliability

- [ ] Define timestamp-aware conflict resolution for progress/settings across devices.
- [ ] Keep progress writes debounced/batched.
- [ ] Add account-switching and cross-device ordering tests.
- [ ] Audit reading-history upsert semantics.
- [ ] Review offline/reconnect behavior where supported.

## P1 — production cleanup

- [ ] Remove dead runtime mock/demo code if no longer used by tests.
- [ ] Keep Vercel runtime errors at zero after auth/API changes.
- [ ] Keep Supabase RLS and cache-owner boundaries intact.
- [ ] Keep WeebCentral relay operation-limited; never turn it into an arbitrary proxy.
- [ ] Review registration policy for the intended private user group.

## Final phase — native/platform distribution

Do not prioritize this until the PWA product is considered ready.

When that phase starts:

- configure persistent Android release signing and validate upgrade behavior;
- validate Windows/Linux/macOS packaging and signing strategy;
- decide Apple Developer/TestFlight path;
- validate native workflows with real credentials;
- create the authenticated downloads/distribution surface if still desired.

Until then, native release workflows stay manual-only.

## Session closeout

Record only what materially changed:

```text
Date:
Main HEAD:
Production deployment:
What was validated:
What remains:
Exact next task:
```
