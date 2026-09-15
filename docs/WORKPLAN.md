# Pachimanga execution workplan

This is the operational backlog and release plan. It is intentionally detailed enough that a new Hermes/agent session can resume work without relying on chat history.

Always verify time-sensitive GitHub, Vercel, and Supabase state before acting on recorded status.

## 0. Current direction and release policy

PWA/web is the only active delivery target until the PWA release-candidate gate in this document is complete.

Current production contract:

- Production URL: `https://pachimanga.frogilab.dev`
- Vercel deploys `main` automatically.
- Supabase authentication is mandatory.
- No guest/demo/anonymous reader mode.
- User library/history/progress/settings/imports/local cache remain account-scoped.
- Browser/PWA WeebCentral uses the operation-limited private relay when configured.
- Tauri/native code remains maintained, but platform distribution is deferred.
- Android debug/release, desktop release, and iOS release workflows remain manual-only.

A release-ready claim requires evidence, not only successful implementation.

## 1. Verified baseline — 2026-09-15

Baseline immediately before this documentation/agent-hardening work:

- `main`: `81c764d1486f2935cf9963e59271d577d62825df`
- Last audited production deployment: Vercel `dpl_88AXMSpWz9UvjfJhFqkLDhnY2BLC`, `READY`, for the same commit.
- Anonymous production `/` returned the required sign-in experience with `Cache-Control: private, no-store`.
- Web Quality passed on the audited `main` commit.
- Native Quality passed on the audited `main` commit.
- Production runtime error/fatal inspection immediately after that deploy found no errors.
- A previous Hermes merge had committed conflict markers into native workflows and broken lint; audit PR #8 repaired them.
- `main` was observed as unprotected with no required status checks at that audit point. Treat branch protection as unverified until Phase 2 is completed.

Do not assume this baseline remains current. Every new session starts with the verification checklist below.

## 2. Mandatory session-start checklist

Before choosing a task:

- [ ] Read `AGENTS.md`.
- [ ] Read this workplan.
- [ ] Load the most specific `.hermes/skills/**/SKILL.md` for the task.
- [ ] Check current `main` HEAD.
- [ ] Check open PRs.
- [ ] Check the active work branch and local working tree; preserve unrelated work.
- [ ] Check latest Vercel production deployment if runtime behavior is in scope.
- [ ] Check Supabase schema/migrations/advisors if auth/data work is in scope.
- [ ] Reproduce a reported bug before editing when practical.
- [ ] Confirm native platform distribution is still deferred unless the user explicitly changed priority.

Default git model:

1. start from current `main`;
2. create one focused branch;
3. complete one coherent workstream;
4. validate;
5. open one PR;
6. merge promptly when green;
7. verify production when runtime changed;
8. retire the branch when tooling permits.

Do not create parallel branches for fragments of the same task.

---

# P0 — Release-blocking work

P0 items must be complete before Pachimanga is called production-ready for the intended private user group.

## Phase 2 — Protect `main` and enforce merge gates

### Goal

Prevent another broken merge from reaching Vercel production.

### Tasks

- [ ] Inspect current GitHub branch protection/rulesets for `main`.
- [ ] Require changes to enter through pull requests for normal development.
- [ ] Require Web Quality for web/runtime changes.
- [ ] Require Vercel deployment/check success before merge where the integration exposes a stable required check.
- [ ] Require Native Quality for workflow/native/Tauri-impacting changes.
- [ ] Prevent force pushes/deletion of `main` unless there is an explicit recovery procedure.
- [ ] Decide whether repository owner/admin bypass should remain available for emergencies; document the decision.
- [ ] Verify a deliberately non-green test PR cannot merge through the normal path.
- [ ] Verify docs-only changes are not blocked by irrelevant native jobs while still receiving repository-hygiene coverage where intended.

### Acceptance evidence

Record:

```text
Ruleset/protection name:
Required checks:
PR requirement:
Force-push/deletion settings:
Test PR used for verification:
```

### Exit criteria

Normal accidental direct pushes/broken PR merges to `main` are blocked by GitHub controls, not only by agent instructions.

---

## Phase 3 — Production authentication and account-isolation E2E

### Goal

Prove the mandatory-account contract in production, including same-browser account switching and cross-device synchronization.

### Supabase auth configuration

- [ ] Verify production Site URL.
- [ ] Verify `https://pachimanga.frogilab.dev/auth/confirm` is allowed where required.
- [ ] Verify local-development redirect URLs are intentional and no wildcard is broader than needed.
- [ ] Review email confirmation policy for the intended private user group.
- [ ] Review password minimum/policy and whether leaked-password protection should be enabled.
- [ ] Confirm reset/recovery redirect behavior.

### Fresh-account flow

Using a new test account:

- [ ] Register.
- [ ] Receive/complete confirmation if enabled.
- [ ] Land in the authenticated application.
- [ ] Sign out.
- [ ] Sign back in.
- [ ] Request password reset.
- [ ] Complete reset/recovery.
- [ ] Sign in with the new password.
- [ ] Confirm old password behavior matches expected Supabase semantics.

### Anonymous route matrix

Test without a valid session:

- [ ] `/`
- [ ] `/library`
- [ ] `/browse`
- [ ] `/import`
- [ ] `/history`
- [ ] `/settings`
- [ ] one `/manga/<id>` route
- [ ] one `/reader/<chapterId>` route if a known ID is available
- [ ] protected source/API routes
- [ ] `/offline` remains intentionally accessible
- [ ] auth/confirmation/reset routes remain intentionally accessible

For every protected route verify:

- no private application HTML/data is exposed;
- the auth experience/redirect is correct;
- cache headers do not permit shared authenticated state.

### Same-browser account isolation

Create Account A and Account B.

Account A:

- [ ] add at least two manga;
- [ ] read/update progress on at least one chapter;
- [ ] create history;
- [ ] change reader settings.

Then:

- [ ] sign out A;
- [ ] sign in B on the same browser profile;
- [ ] verify A's library is not visible;
- [ ] verify A's history is not visible;
- [ ] verify A's progress is not visible;
- [ ] verify A's reader settings are not inherited;
- [ ] inspect IndexedDB/localStorage if necessary to confirm cache owner rebinding.

Then switch back to A:

- [ ] remote A state returns correctly;
- [ ] B state is not visible.

### Cross-device/account sync

Use two browser profiles or devices with the same account:

- [ ] add/remove a library item on Device 1 and observe expected Device 2 behavior after refresh/reconciliation;
- [ ] update reading progress on Device 1;
- [ ] verify progress/history on Device 2;
- [ ] update reader settings and verify intended synchronization;
- [ ] test a near-simultaneous change to expose current conflict behavior;
- [ ] record any last-write/conflict ambiguity for Phase 10.

### Exit criteria

No auth bypass or cross-account leak; registration/login/logout/reset are confirmed; same-account remote synchronization works for the intended private-user workflow.

---

## Phase 4 — Supabase schema/security cleanup

### Goal

Remove known schema/advisor debt without weakening application upserts or RLS.

### Duplicate library index

Known state from prior advisor audit:

- Keep: `library_entries_user_id_source_id_manga_id_key`
- This index backs the table unique constraint used by the application conflict target.
- Redundant standalone index: `library_entries_user_source_manga_idx`

Tasks:

- [ ] Re-inspect current production indexes before writing a migration.
- [ ] Confirm the names/columns still match the known state.
- [ ] Add a new migration that drops only `library_entries_user_source_manga_idx` if it still exists.
- [ ] Do not rewrite migrations `001_auth_library.sql` or `002_sync_tables.sql`.
- [ ] Validate library add/upsert after migration.
- [ ] Validate duplicate add behavior remains idempotent.
- [ ] Re-run Supabase performance advisors.
- [ ] Re-run Supabase security advisors.
- [ ] Record before/after advisor findings.

### Auth security review

- [ ] Review leaked-password protection setting.
- [ ] Review registration policy for a private user group.
- [ ] Confirm no service-role credential is used in browser-visible code.
- [ ] Review auth redirect allowlist.
- [ ] Confirm RLS remains enabled for all user-owned tables.
- [ ] Inspect policies for `profiles`, `library_entries`, `reading_progress`, `reading_history`, `user_settings`.

### Exit criteria

No known duplicate-index warning remains; application upsert behavior is intact; no critical security-advisor issue is left unexplained.

---

## Phase 5 — Source/provider reliability

### Goal

Make Browse -> detail -> chapter -> reader reliable across supported providers with explicit failure behavior.

### Shared source contract

- [ ] Review `src/sources/core` normalization and `tests/source-contract.test.ts`.
- [ ] Verify every production provider maps into normalized Manga/Chapter/Page models.
- [ ] Verify provider errors remain provider errors rather than mock fallback.
- [ ] Verify empty metadata/chapters/pages produce intentional UI states.

### MangaDex

- [ ] Search known title.
- [ ] Open metadata/detail.
- [ ] Load English chapter list where available.
- [ ] Open reader pages.
- [ ] Verify cover/page URLs render.
- [ ] Verify no-results and upstream error states.

### ComicK

- [ ] Search known title.
- [ ] Open metadata/detail.
- [ ] Verify readable English chapters when available.
- [ ] Verify metadata-only/no-readable-chapter behavior is explicit.
- [ ] Open source link behavior if in-app chapters are unavailable.
- [ ] Verify no-results/upstream error states.

### WeebCentral — browser/PWA

- [ ] Verify `WEEBCENTRAL_RELAY_URL` and `WEEBCENTRAL_RELAY_TOKEN` are configured server-side where required.
- [ ] Verify public relay health.
- [ ] Verify authenticated upstream relay health.
- [ ] Search known title.
- [ ] Load metadata.
- [ ] Load chapter list.
- [ ] Open chapter/page discovery.
- [ ] Verify page images load from intended hosts.
- [ ] Verify 403/429/upstream refusal is surfaced clearly.
- [ ] Verify relay rejects unsupported operations/invalid IDs.
- [ ] Verify there is no arbitrary destination URL input.
- [ ] Inspect Vercel/relay logs after smoke testing for token or private-data leakage.

### Source performance/retry behavior

- [ ] Identify slow provider paths and confirm loading feedback appears before users assume the app is stuck.
- [ ] Avoid unbounded retries.
- [ ] Avoid duplicate concurrent searches caused by UI state churn.
- [ ] Confirm search input length/normalization behavior.

### Exit criteria

Each provider has a documented successful happy path and explicit verified failure/no-data behavior; production never substitutes mock content.

---

## Phase 6 — PWA UI/UX consistency pass

### Goal

Finish a route-by-route polish pass without redesigning the product into a new visual system.

Use `docs/art-direction.md`, `pachimanga-ui`, and `pachimanga-design`.

### Required viewport matrix

Every material route should be checked at:

- [ ] 360px phone
- [ ] ~390–430px phone
- [ ] ~768px tablet
- [ ] ~1280px desktop
- [ ] installed-PWA standalone where relevant

### Global shell/navigation

- [ ] Desktop sidebar spacing/hierarchy.
- [ ] Mobile top bar/bottom navigation.
- [ ] Safe-area insets in standalone mode.
- [ ] Active route states.
- [ ] Account/sign-out access.
- [ ] No horizontal overflow at 360px.
- [ ] Keyboard focus order.
- [ ] Touch targets >= ~40px.
- [ ] `prefers-reduced-motion` behavior.

### Auth

- [ ] Sign-in/register state clarity.
- [ ] Validation/error copy.
- [ ] Password reset affordance.
- [ ] Mobile keyboard/form usability.
- [ ] Pachi/brand art does not crowd the form on narrow screens.

### Library

- [ ] Welcome/hero density.
- [ ] Search/focus shortcut behavior.
- [ ] Status/filter controls.
- [ ] Manga-card title/status/progress hierarchy.
- [ ] Empty library guidance to Browse/Import.
- [ ] Loading state.
- [ ] Error/retry state.
- [ ] Long title truncation/wrapping.
- [ ] Missing cover behavior.

### Browse

- [ ] Search controls are clear on mobile.
- [ ] Provider/source state is understandable.
- [ ] Search loading/no-results/error states.
- [ ] Card consistency with Library.
- [ ] No stale previous-query results presented as current results.
- [ ] Retry behavior.

### Manga detail

- [ ] Cover/meta/action hierarchy.
- [ ] Description formatting.
- [ ] Continue/Read latest semantics.
- [ ] Add/remove library feedback.
- [ ] Chapter pagination controls at top/bottom.
- [ ] Read/unread control accessibility.
- [ ] Bulk mark progress/cancel behavior.
- [ ] Metadata-only/no-readable-chapter state.
- [ ] Very large chapter-count behavior.

### Import

- [ ] Source-file selection affordance.
- [ ] OCR progress/review clarity.
- [ ] Backup-format detection feedback.
- [ ] Matching/review workflow.
- [ ] Partial failure reporting.
- [ ] Duplicate handling.
- [ ] Final import summary.

### History

- [ ] Empty state.
- [ ] Ordering/read-state clarity.
- [ ] Resume navigation.
- [ ] Cross-device refresh behavior.

### Settings

- [ ] Account information/actions are clear.
- [ ] Reader settings match actual reader behavior.
- [ ] Dangerous/clear-data actions are explicit and confirmed.
- [ ] Install/PWA guidance links are current.

### Install/offline/error/not-found

- [ ] Install instructions by platform are accurate.
- [ ] Standalone-detection state is accurate.
- [ ] Offline page explains limits without implying full offline library support.
- [ ] Error/not-found surfaces provide useful recovery action.

### Exit criteria

No known P1 responsive/accessibility/design inconsistency remains on the core route matrix.

---

## Phase 7 — Reader release hardening

### Goal

Treat Reader as the core product and eliminate known layout/progress/input regressions.

### Conventional manga matrix

- [ ] First page load.
- [ ] Middle-page navigation/scroll.
- [ ] Last page/completion behavior.
- [ ] Progress percentage updates.
- [ ] Reload restores correct position.
- [ ] Chapter navigation to next/previous when available.

### Long-strip/manhwa matrix

- [ ] Images retain usable width.
- [ ] No narrow-column regression.
- [ ] Long pages do not create broken gaps/jumps.
- [ ] Progress remains stable over a long chapter.
- [ ] Background/resume does not jump dramatically.

### Auto-scroll

- [ ] Play/pause.
- [ ] Speed/multiplier behavior.
- [ ] Elapsed-time movement independent of frame rate.
- [ ] Background/suspend elapsed-time cap.
- [ ] Wheel/touch/manual input pauses where intended.
- [ ] No scheduled movement while paused.
- [ ] Reduced-motion behavior is respected.

### Images/preload

- [ ] Reserved aspect ratio prevents large layout shift.
- [ ] Native lazy loading works for distant pages.
- [ ] Preload stays bounded to intended next pages.
- [ ] Broken image/load error is visible/recoverable.

### Progress/history/offline

- [ ] Progress writes immediately to local IndexedDB.
- [ ] History updates locally.
- [ ] Outbox entry is created.
- [ ] Successful online save clears queue entry.
- [ ] Failed/offline save remains queued.
- [ ] Reconnect/boot flush pushes queued state.
- [ ] Account switch cannot flush Account A queue under Account B.
- [ ] Read/unread and bulk-read controls reconcile expected summary state.

### Controls/accessibility

- [ ] Touch controls.
- [ ] Keyboard controls.
- [ ] Focus does not become trapped in hidden chrome.
- [ ] Labels on icon-only buttons.
- [ ] Fullscreen/standalone viewport behavior.

### Exit criteria

Reader passes both content modes, progress persistence/offline queue, input, suspend, and accessibility checks with no P0/P1 regression.

---

## Phase 8 — Import reliability

### Goal

Make all supported import formats predictable, reviewable, account-scoped, and safe on malformed/partial input.

### OCR/image import

- [ ] Supported image type/size behavior.
- [ ] OCR progress state.
- [ ] OCR cancellation/retry behavior if present.
- [ ] Text cleanup/title extraction tests.
- [ ] User review before final match/import.
- [ ] Failure does not silently create junk library entries.

### Tachiyomi/Mihon backup

- [ ] `.tachibk` happy path.
- [ ] `.proto.gz` happy path.
- [ ] Unsupported/corrupt archive feedback.
- [ ] Large backup behavior.
- [ ] Duplicate title handling.
- [ ] Preserve useful progress metadata where supported.

### Tachimanga `.tmb`

- [ ] Format/column parser tests remain green.
- [ ] Real representative backup import.
- [ ] Corrupt/partial database behavior.
- [ ] Duplicate/missing-source handling.

### JSON fallback

- [ ] Schema validation.
- [ ] Invalid JSON feedback.
- [ ] Partial invalid records are reported instead of silently ignored.

### Account boundary

- [ ] Imports land only in current account library.
- [ ] Account switch during/after import cannot leak state.
- [ ] Sign-out cannot leave an anonymous parallel library.

### Exit criteria

All supported formats have at least one representative success path and one malformed-input regression path; import outcome is reviewable and account-owned.

---

## Phase 9 — PWA install/update/offline behavior

### Goal

Prove installability, safe service-worker updates, and accurate offline behavior across target browsers.

### Manifest/assets

- [ ] Validate manifest name/short name/start URL/display/theme/background colors.
- [ ] Validate 192/512/maskable icons.
- [ ] Validate Apple touch icon.
- [ ] Confirm no broken asset paths after production deploy.

### Service worker

- [ ] Fresh install registers successfully.
- [ ] Existing install receives a new service worker after deploy.
- [ ] `skipWaiting`/`clients.claim` behavior does not trap users on broken mixed assets.
- [ ] Old unrelated caches are cleaned as intended.
- [ ] API requests are not cached by SW.
- [ ] Authenticated navigation remains network-first.
- [ ] Offline navigation reaches `/offline`.
- [ ] Static/images cache behavior does not cross account data boundaries.

### Browser/platform matrix

- [ ] iPhone Safari -> Add to Home Screen -> standalone.
- [ ] iPad Safari -> standalone.
- [ ] Android Chrome -> install -> standalone.
- [ ] Desktop Chromium -> install -> standalone.
- [ ] Normal browser window remains correct.

### Update scenario

- [ ] Install current production PWA.
- [ ] Deploy a harmless version-identifiable change in preview/staging workflow where practical.
- [ ] Confirm existing install updates without broken navigation/static chunks.
- [ ] Confirm user auth/account state behaves as expected after update.

### Exit criteria

Install/update/offline behavior is documented and repeatable on the intended browser set; no authenticated HTML is reused as a public offline shell.

---

# P1 — Reliability and production-quality work

P1 items should be complete before broadening beyond the small intended user group and preferably before the final native phase.

## Phase 10 — Synchronization/conflict semantics

### Goal

Turn current best-effort sync into explicitly defined, tested behavior.

### Current known implementation

- Library mutations are remote-first then cached.
- Progress/history saves are local-first with IndexedDB outbox retry.
- Reader settings are local cached + asynchronous Supabase upsert.
- Cross-device conflict semantics are not fully formalized.

### Tasks

- [ ] Define authoritative timestamp for `reading_progress`.
- [ ] Define whether stale remote writes can overwrite newer local progress.
- [ ] Define history upsert semantics: current conflict target is effectively one latest row per user/source/manga.
- [ ] Define settings last-write semantics.
- [ ] Decide whether library add/remove needs offline queue support or is intentionally online-only.
- [ ] Decide whether settings require an outbox/retry model.
- [ ] Verify outbox is owner-bound/cleared correctly across account switches.
- [ ] Add tests for out-of-order queued progress.
- [ ] Add tests for reconnect after multiple updates to the same chapter.
- [ ] Add tests for account switch with pending queue.
- [ ] Add tests for cross-device stale-write scenario at the pure logic layer where possible.
- [ ] Surface pending sync state in UI only if it materially helps the private-user workflow; avoid noisy always-on sync indicators.

### Exit criteria

Sync/conflict semantics are documented in `architecture.md`, represented in tests, and do not depend on accidental request ordering.

---

## Phase 11 — Automated browser E2E coverage

### Goal

Add a maintainable browser-level regression layer for the flows that unit tests cannot prove.

### Decision task

- [ ] Evaluate Playwright or another minimal E2E approach compatible with Next.js 16/Vercel/Supabase test credentials.
- [ ] Decide local-only vs CI E2E scope.
- [ ] Avoid putting production user credentials in repository secrets unless intentionally managed.

### Minimum automated flows

- [ ] anonymous protected-route redirect/auth experience;
- [ ] sign-in with dedicated test user in a safe test environment;
- [ ] Library empty/non-empty state;
- [ ] Browse search stub/test-source or controlled integration path;
- [ ] manga detail/chapter navigation;
- [ ] reader basic page rendering/progress event;
- [ ] account logout/cache isolation behavior where practical.

### Visual/responsive checks

- [ ] 360px shell/navigation smoke.
- [ ] desktop shell smoke.
- [ ] no horizontal overflow on core routes.

### Exit criteria

Critical account/navigation regressions can be caught automatically before merge without making CI dependent on unstable live manga providers.

---

## Phase 12 — Observability and operational readiness

### Goal

Make production failures diagnosable without adding invasive telemetry.

### Vercel

- [ ] Define a standard post-deploy runtime-error check.
- [ ] Review server/API logs for accidental secrets/user content.
- [ ] Identify recurring source-route errors/timeouts.
- [ ] Review function duration/size only where it impacts user experience or plan limits.

### Relay

- [ ] Ensure health endpoints distinguish service health from upstream health.
- [ ] Ensure logs do not print bearer token.
- [ ] Define restart/update procedure.
- [ ] Define what happens if relay is down: explicit UI failure, no unsafe fallback.

### Supabase

- [ ] Record advisor review cadence during active hardening.
- [ ] Confirm expected RLS failures are distinguishable from provider/UI failures in development logs.

### Operational checklist

Create or keep current a concise production incident flow:

1. identify failing surface;
2. correlate Vercel commit/deployment;
3. inspect runtime/build logs;
4. inspect Supabase/relay only if implicated;
5. reproduce against preview/current main;
6. fix on one branch;
7. validate and deploy;
8. verify logs after recovery.

### Exit criteria

A new agent can diagnose auth/source/deploy failures without guessing which infrastructure layer owns the problem.

---

## Phase 13 — Performance and payload review

### Goal

Avoid preventable PWA latency/CPU/memory costs while preserving correctness.

- [ ] Review largest client bundles/routes after current feature growth.
- [ ] Verify OCR/Tesseract/SQL.js heavy dependencies are not unnecessarily loaded on unrelated routes.
- [ ] Verify manga detail with large chapter counts remains responsive.
- [ ] Verify long-strip reader memory behavior/preload remains bounded.
- [ ] Review source search request duplication/debouncing.
- [ ] Review image `unoptimized` usage and provider constraints before changing it.
- [ ] Review service-worker cache growth/eviction assumptions.
- [ ] Check mobile interaction responsiveness on a real mid-range device where possible.

Exit when no obvious P1 performance regression blocks normal private-user use.

---

## Phase 14 — Code/repository cleanup

### Goal

Remove obsolete paths only after production behavior is stable.

- [ ] Audit `src/sources/mock` and mock-data usage; retain only test/dev dependencies.
- [ ] Remove dead demo-era runtime paths if any remain.
- [ ] Remove obsolete components/styles after confirming no route uses them.
- [ ] Consolidate duplicated surfaces/buttons/radii/gaps only when it reduces drift without a broad redesign.
- [ ] Review stale scripts/docs references.
- [ ] Keep repo-hygiene test coverage for conflict markers in source/docs/workflows/tooling.
- [ ] Add `.hermes/` to hygiene coverage in a future test change if not already covered by then.
- [ ] Review stale merged branches and delete them when tooling/permissions permit.

Do not combine this cleanup with risky auth/sync/provider changes unless required.

---

# Release-candidate gate — PWA

The PWA is ready to be called a release candidate only when all of the following are true:

## Security/account

- [ ] Production auth flows verified.
- [ ] Anonymous route matrix verified.
- [ ] Same-browser two-account isolation verified.
- [ ] RLS/security advisor review complete.
- [ ] No critical secret exposure.

## Core product

- [ ] Library happy/error/empty states verified.
- [ ] Browse works across intended providers.
- [ ] Manga detail/chapter controls verified.
- [ ] Conventional reader verified.
- [ ] Long-strip reader verified.
- [ ] Progress/history/settings sync verified.
- [ ] Import formats verified.

## PWA

- [ ] iOS/iPadOS install/standalone verified.
- [ ] Android install/standalone verified.
- [ ] Desktop install/standalone verified.
- [ ] Service-worker update behavior verified.
- [ ] Offline fallback verified and account-safe.

## Quality/operations

- [ ] Required GitHub merge protection active.
- [ ] Web Quality green.
- [ ] Relevant Native Quality green when shared/native-impacting files changed.
- [ ] Vercel production `READY` for intended `main` commit.
- [ ] Production smoke passes.
- [ ] Runtime error/fatal logs clean after smoke or findings are understood.
- [ ] No open P0 issue.
- [ ] No known P1 issue that makes normal private-user use unreliable.
- [ ] Documentation matches actual behavior.

When the gate is met, record the exact commit/deployment and freeze unrelated feature expansion until the final platform decision is made.

---

# Final phase — Native/platform distribution

Do not start this phase in parallel with unfinished PWA P0 work.

## Phase N1 — Native security/current-code re-audit

- [ ] Re-read `NATIVE.md` and `native-release-pipeline.md`.
- [ ] Confirm Tauri origin/capability restrictions.
- [ ] Confirm `weebcentral_request` remains source-specific.
- [ ] Confirm current production UI/auth works inside the shell.
- [ ] Run Native Quality from the release-candidate code.

## Phase N2 — Android

- [ ] Confirm persistent release keystore ownership/backup.
- [ ] Configure/reconfirm GitHub signing secrets.
- [ ] Run manual Android debug APK for device smoke.
- [ ] Run manual signed APK/AAB build.
- [ ] Install signed APK on real device.
- [ ] Upgrade from previous signed build.
- [ ] Verify auth/source/reader/progress.
- [ ] Decide direct APK vs Play distribution.

## Phase N3 — Windows/Linux/macOS

- [ ] Run manual desktop workflow.
- [ ] Validate Windows MSI/NSIS install/upgrade/uninstall.
- [ ] Validate Linux DEB/RPM/AppImage on supported distributions.
- [ ] Validate signatures/checksums.
- [ ] Decide macOS native distribution vs PWA-only.
- [ ] If native macOS is desired, validate Developer ID signing/notarization.

## Phase N4 — iOS/iPadOS

- [ ] Decide whether native iOS is needed beyond the PWA.
- [ ] If yes, confirm Apple Developer membership/App Store Connect setup.
- [ ] Validate bundle ID/provisioning/certificate.
- [ ] Run manual iOS build/export.
- [ ] Add/validate TestFlight upload only as an explicit reviewed change.
- [ ] Verify production auth/source/reader behavior on device.

## Phase N5 — Publication

- [ ] Version consistency check passes.
- [ ] Artifacts tested before publication.
- [ ] Publish/tag deliberately; do not restore automatic tag-triggered native publishing without a new design decision.
- [ ] Record artifact hashes/signing evidence.
- [ ] Create user-facing installation/update instructions.
- [ ] Verify upgrade path remains supported for future releases.

---

# Recommended immediate execution order

Unless new production failures appear, proceed in this order:

1. **GitHub protection/ruleset hardening** — stop broken merges from reaching production.
2. **Production auth/account E2E** — prove the mandatory-account contract.
3. **Supabase duplicate-index/security cleanup** — remove known schema/advisor debt.
4. **Provider reliability smoke** — MangaDex, ComicK, WeebCentral relay.
5. **Route-by-route PWA polish** — mobile/tablet/desktop/standalone.
6. **Reader hardening** — conventional + long-strip + progress/outbox.
7. **Import reliability** — all supported formats.
8. **PWA install/update/offline matrix**.
9. **Sync/conflict semantics**.
10. **Browser E2E automation**.
11. **Observability/performance/cleanup**.
12. **PWA release-candidate gate**.
13. **Only then: native/platform distribution**.

If a P0 production bug is discovered at any point, fix it before continuing with lower-priority polish.

---

# Session closeout template

At the end of every substantive session, update this workplan or leave equivalent concrete evidence:

```text
Date:
Branch / PR:
Main HEAD observed:
Production deployment observed:
Workplan item(s) completed:
Files / behavior changed:
Checks actually run/observed:
Production smoke performed:
Known blockers / risks:
Exact next task:
```

Do not mark a checkbox complete without evidence appropriate to the item. Do not use “looks good” as acceptance evidence for auth, data isolation, sync, deployment, or reader regressions.