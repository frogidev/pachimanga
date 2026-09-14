# Pachimanga continuation workplan

This is the operational handoff for the next development chat/session. It records the current product state, unresolved validation, and the recommended order of work.

Always read `AGENTS.md` first and verify current GitHub/Vercel/Supabase state before acting on anything time-sensitive in this file.

## New-chat kickoff

Use this sequence at the start of the next session:

1. Read `AGENTS.md`, `README.md`, `docs/architecture.md`, this file, and `NATIVE.md`.
2. Fetch current `main` HEAD and recent commits.
3. Check for open PRs/branches and current GitHub Actions status.
4. Check the latest Vercel production deployment and runtime errors.
5. Confirm the Supabase project/schema before making auth/data changes.
6. Reproduce or verify the highest-priority item below before changing code.

## Current product state

As of 2026-09-14, the runtime baseline includes:

- Production UI at `https://pachimanga.frogilab.dev`.
- Mandatory Supabase login/registration.
- No guest/demo/anonymous application mode.
- Anonymous requests to the app root are routed to `/auth`.
- Library, progress, history, settings, and imports are account-owned.
- Supabase RLS is used for user isolation.
- IndexedDB/localStorage cache ownership is rebound to the authenticated user.
- MangaDex and ComicK source paths are available.
- Browser/PWA WeebCentral can use the private Frogilab relay.
- Tauri native WeebCentral uses the dedicated Rust `weebcentral_request` bridge.
- The native bridge has been validated on a physical Android device.
- A real WeebCentral long-strip chapter has been used to validate native fetching and the reader-width fix.
- `Web Quality` and `Native Quality` workflows exist and the mandatory-auth change was green when merged.
- Signed Android, desktop, and iOS-oriented release workflows exist, but real signing credentials/platform distribution have not all been exercised end-to-end.

The runtime commit immediately before this documentation handoff was:

```text
250fd425c16696e7a1370ec2746e6bf130b1a13f
feat: require accounts and remove demo mode
```

Do not assume that SHA is still current after this documentation branch is merged.

## P0 — finish mandatory-account production validation

Goal: prove the new access model works end-to-end, not only at the route-guard level.

Checklist:

- [ ] In Supabase Authentication URL configuration, verify the production confirmation redirect is allowed:

  ```text
  https://pachimanga.frogilab.dev/auth/confirm
  ```

- [ ] Register a new throwaway user from production.
- [ ] Complete email confirmation.
- [ ] Sign in and sign out.
- [ ] Exercise password reset/forgot-password.
- [ ] Verify `/`, `/library`, `/browse`, `/import`, `/history`, manga details, reader routes, and protected API routes do not expose app content anonymously.
- [ ] Verify authenticated responses remain private/no-store where expected.
- [ ] After logout, verify no previous-account library/history/settings appear.
- [ ] Sign into a second account on the same browser/device and confirm local cache isolation.
- [ ] Sign into the same account on a second device/PWA and verify library/settings/progress synchronization.

Definition of done: a fresh user can register, confirm, configure their library, read, sync to another device, sign out, and leave no cross-account local state behind.

## P0 — Android/native regression validation

Goal: close the remaining real-device validation around the hosted-UI + native-bridge architecture.

Checklist:

- [ ] Force-close/reopen the existing Android Tauri app so it loads the latest hosted UI.
- [ ] Confirm the app now presents mandatory auth when no session exists.
- [ ] Sign in using the same account as web/PWA.
- [ ] Open WeebCentral search and confirm native bridge status is healthy.
- [ ] Re-test a real long-strip/manhwa chapter, including the chapter previously used for validation.
- [ ] Confirm pages render at usable/natural content width, not as narrow columns.
- [ ] Confirm reading progress is saved to the authenticated account.
- [ ] Confirm reopen/resume works after app restart.

A frontend-only UI fix does not require reinstalling the native APK because the shell loads the production URL. Reinstall only when native/Tauri/Rust configuration changes.

## P0 — Supabase schema cleanup

A previous advisor pass identified duplicate unique indexes on `library_entries` for the same logical columns `(user_id, source_id, manga_id)`.

Checklist:

- [ ] Re-run Supabase database advisors/current schema inspection; do not rely only on this note.
- [ ] Confirm which index is the table constraint backing index and which is the redundant explicit index.
- [ ] Add a migration that drops only the redundant index.
- [ ] Re-run advisors after migration.
- [ ] Verify library upsert conflict target still works.

Do not drop the unique constraint itself unless the application conflict/upsert model is intentionally redesigned.

## P1 — harden cross-device synchronization

The current storage layer is intentionally simple and works for a small private group, but conflict semantics should be made explicit.

Areas to review:

- [ ] `getProgress()` currently prefers local cached progress when present. Decide how a newer remote update from another device should win.
- [ ] Define last-write-wins or another conflict rule using timestamps.
- [ ] Avoid excessive progress writes while scrolling; keep updates debounced/batched where possible.
- [ ] Confirm reading history upsert semantics are correct for multiple chapters of the same manga.
- [ ] Decide whether library rows should store richer normalized metadata or always rehydrate full metadata from source/local cache.
- [ ] Add tests for account switching and cross-device update ordering.
- [ ] Add tests for offline changes followed by reconnect if offline mutation support is expanded.

For the expected small user count, correctness and privacy matter more than premature distributed-sync complexity.

## P1 — audit residual mock/demo code

The product must not expose a preview/demo experience, but mock code still exists for development/testing.

Checklist:

- [ ] Search for imports/usages of `src/lib/mock-data.ts`.
- [ ] Search for runtime registrations/usages of `src/sources/mock`.
- [ ] Ensure no production route silently falls back to mock manga.
- [ ] Keep mocks only where they improve deterministic tests/development.
- [ ] If unused, remove dead mock code in a separate cleanup PR.

Do not substitute mock content when a real source fails; show an error/fallback source state instead.

## P1 — private distribution for 20–50 users

Target audience is a small private group, not a large public store launch.

Recommended product/distribution model:

- Web/PWA: production URL, mandatory Pachimanga account.
- Android: direct signed APK using one persistent release key.
- Windows: direct MSI/NSIS; signing quality depends on available certificate/trust path.
- Linux: AppImage/DEB/RPM through GitHub Releases.
- macOS: direct DMG/app; Developer ID + notarization if paying for Apple Developer membership.
- iPhone/iPad: PWA for zero Apple cost; TestFlight is the clean native path if Apple Developer membership is purchased.

Tasks:

- [ ] Decide whether to pay for Apple Developer membership now or keep iOS/macOS on PWA/unsigned-direct paths.
- [ ] Configure persistent Android release signing secrets.
- [ ] Run `.github/workflows/android-release.yml` with real signing credentials.
- [ ] Install the release-signed APK on a clean device and verify future same-key upgrades.
- [ ] Run Linux desktop release artifact generation.
- [ ] Validate Windows workflow with the chosen signing/no-signing strategy.
- [ ] Validate macOS workflow on a real Mac before sharing broadly.
- [ ] If Apple Developer is enabled, update iOS CI from IPA-only output to a supported App Store Connect/TestFlight upload flow.

Important Android note: a release-key APK generally cannot update over the existing debug-key APK. Expect one uninstall/reinstall when switching testers from debug to the persistent release key.

## P1 — single private downloads surface

For friend distribution, a practical next feature is an authenticated downloads page inside Pachimanga.

Possible route:

```text
/download
```

Desired behavior:

- Requires the same Pachimanga login.
- Offers current Android/Windows/Linux/macOS artifacts or trusted release links.
- iOS button links to the TestFlight invitation when available, otherwise explains PWA install.
- Does not expose signing secrets or privileged GitHub credentials.
- Shows version/build date and basic install notes.

Decide whether release artifacts should be public GitHub Releases or proxied/linked only after auth. Application auth is the real privacy boundary for manga/user data; installer URLs alone should not be treated as confidential software secrets.

## P1 — decide registration policy

Mandatory registration is implemented, but the desired admission policy for a 20–50-person private group still needs an explicit product decision.

Options:

1. Open email/password registration: anyone with the URL can create an account.
2. Invite/allowlist registration: only approved users can become active.
3. Open registration plus manual moderation/deactivation.

If the app is intended strictly for friends, an allowlist/invite model is preferable. Do not implement this implicitly; choose the policy first and document it.

## P2 — native release pipeline hardening

The release workflows exist but should be considered unproven until they run with real platform credentials.

Tasks:

- [ ] Pin/align Tauri CLI and Rust crate versions if CI reveals incompatibilities.
- [ ] Validate generated Android Gradle signing patch logic against current Tauri output.
- [ ] Verify APK and AAB signatures with platform tooling.
- [ ] Validate Windows Tauri config override/merge behavior in CI.
- [ ] Validate Apple certificate import, signing identity selection, notarization, and provisioning on real credentials.
- [ ] Generate checksums/release notes consistently across platforms.
- [ ] Keep platform credentials in GitHub Actions Secrets or another secret manager only.

## P2 — capacity and production hygiene

The expected 20–50 users are far below current infrastructure capacity, but basic hygiene is still useful.

Tasks:

- [ ] Keep Supabase DB advisors clean.
- [ ] Watch DB growth of `reading_progress`/history rather than manga image bandwidth.
- [ ] Keep manga image bytes direct from source hosts/native device where possible; do not route image traffic through Supabase.
- [ ] Keep Vercel runtime errors at zero and inspect logs after auth/API changes.
- [ ] Consider branch protection/required `Web Quality` and `Native Quality` checks once the workflow settles.
- [ ] Add backup/recovery notes for release signing keys before sharing release builds.

## Known architectural constraints

Do not accidentally change these while implementing roadmap items:

- Tauri loads the remote production frontend.
- Native IPC is restricted to the Pachimanga production origin.
- `weebcentral_request` is not an arbitrary HTTP proxy.
- Browser/PWA relay token is server-only.
- Auth is mandatory before application usage.
- Supabase RLS is the data-security boundary.
- User caches must not leak across accounts.
- Native and web runtimes should present the same product/account state.

## Suggested next PR sequence

A clean continuation sequence would be:

1. `test/auth-e2e-hardening` — add automated coverage for anonymous route protection/account cache ownership where practical.
2. `fix/supabase-duplicate-index` — migration-only schema cleanup after advisor confirmation.
3. `fix/sync-conflict-semantics` — timestamp-aware progress/settings reconciliation.
4. `chore/remove-runtime-mocks` — only if the audit confirms dead/user-facing mock paths.
5. `release/android-signed-validation` — signing setup and real-device release APK validation.
6. `feat/private-downloads` — authenticated downloads/install surface.
7. `release/apple-private-distribution` — only after Apple membership/signing choice.

Keep each PR focused; do not mix data-schema changes, auth changes, and release-signing changes unless they are inseparable.

## End-of-session handoff template

Before ending a future session, update this file with:

```text
Date:
Main HEAD:
Production deployment:
PRs opened/merged:
What was validated:
What is still unvalidated:
Known blockers:
Exact next task:
```

The next session should not have to reconstruct critical state from chat history alone.
