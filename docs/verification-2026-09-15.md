# Production verification snapshot — 2026-09-15

This file records concrete verification evidence from the current PWA release-hardening pass. It is a dated snapshot, not a replacement for `WORKPLAN.md` or live production checks.

## Repository and CI

Verified during this pass:

- `main` reached `847407b50f75ca857d6d1ec0dfd4c345af86689a` after PR #34.
- `Repository Hygiene` runs on every pull request and every push to `main`.
- `Web Quality` runs on every pull request and every push to `main`, so its `quality` result is a stable required check.
- For hosted-runtime changes, Web Quality runs unit tests, lint, typecheck, and a production Next.js build on Node 22.
- For docs/agent/native-only changes, Web Quality still reports the `quality` check but skips unnecessary npm/build work.
- Active `checkout`/`setup-node` actions use v7 while the project runtime remains Node 22.

### `main` ruleset

GitHub ruleset `Protect main` was verified active for the default branch and Phase 2 branch-protection work is complete.

Current rules:

- branch deletion blocked;
- non-fast-forward/force pushes blocked;
- pull requests required;
- zero approving reviews required for this single-maintainer/private workflow;
- review-thread resolution required;
- squash is the only allowed merge method;
- branches must be up to date before merge;
- no bypass actors are configured;
- required GitHub Actions checks are `hygiene` and `quality`.

PR #33 made `quality` an always-present safe merge check. PR #34 verified the docs-only path: both `hygiene` and `quality` succeeded while unnecessary setup-node/npm/test/lint/typecheck/build steps were skipped. Issue #10 is closed as completed.

Vercel is intentionally not a universal required check while Hobby build-rate limits can fail independently of application CI. Native Quality is intentionally not universal because it remains path-sensitive and native release workflows remain manual-only.

## Supabase production audit

Project: `gwpgaojsemcfikgynxwv`.

Verified read-only against production:

- Project state is healthy.
- RLS is enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`.
- Policies on those tables remain authenticated-user/owner scoped.
- `library_entries_user_source_manga_idx` is absent.
- The retained `(user_id, source_id, manga_id)` unique constraint/index is `library_entries_user_id_source_id_manga_id_key`.
- Repository migration `003_drop_redundant_library_index.sql` matches the cleaned production state.
- Supabase performance advisor returns no lints.
- Supabase security advisor has one remaining warning: leaked-password protection is disabled.

The current Supabase plan does not include leaked-password protection. Issue #14 was closed as `not planned` for the current plan. The warning is accepted rather than treated as a release blocker; mandatory accounts, RLS/owner isolation, publishable-key-only browser access, strict recovery redirects, and the existing password minimum remain compensating controls.

No production schema, RLS, auth configuration, or user data was mutated during this audit.

## Anonymous production access

Anonymous requests were verified against production for representative protected routes including:

- `/`
- `/library`
- `/browse`
- `/import`
- `/api/source/weebcentral/status`

Observed behavior:

- requests resolve to the authentication experience rather than protected application content;
- session-enforced responses use `Cache-Control: private, no-store`;
- there is no guest/demo fallback.

The route/session guard implementation also confirms only `/auth...` and `/offline` are intentionally public application paths.

## WeebCentral relay

The relay container image is `ghcr.io/frogidev/pachimanga-weebcentral-relay:latest` and the application expects the relay service on local port `127.0.0.1:8787` behind the Cloudflare tunnel.

Operator follow-up on 2026-09-15:

- the Portainer `pachimanga-relay` stack was updated/redeployed;
- `pachimanga-weebcentral-relay` reports `healthy` in Portainer;
- the existing relay token was retained rather than rotated;
- the Cloudflare relay path was checked as part of the operator rollout.

The authenticated application route for relay status remains intentionally behind the account boundary, so anonymous verification continues to resolve to `/auth`.

## Sync/account hardening

Merged earlier in this pass:

- progress outbox entries record the authenticated `userId`;
- outbox flush accepts only entries owned by the active user;
- legacy/unowned/cross-account entries are discarded rather than replayed under another account;
- account rebinding clears all account-owned IndexedDB stores including the outbox;
- chapter progress reconciles local/remote state by `updatedAt`, with remote winning exact ties;
- Library and History can use the bound local cache during transient remote read failures;
- reader settings remain usable locally when remote reads/saves are temporarily unavailable;
- unit tests cover ownership filtering and progress freshness.

This is defense in depth, not final server-side multi-device conflict prevention. Stronger stale-write semantics remain Phase 10 work.

## Vercel state

The most recent confirmed production deployment remains a READY deployment from before the latest runtime changes.

Subsequent Vercel attempts have encountered the Hobby account rolling build-rate limit. GitHub application CI remains green; this is a Vercel quota condition, not an application compile/test failure.

The repository now contains ignored-build handling so non-runtime-only changes do not unnecessarily consume Vercel builds. Do not claim later runtime changes are live until a descendant production deployment reaches READY and receives a post-deploy smoke check.

## Remaining external/manual blockers

The remaining manual/external work is intentionally narrow:

1. Complete fresh-account email confirmation/password-reset and two-account/two-device production E2E using real accounts.
2. Complete real-device installed-PWA validation across iOS/iPadOS/Android/desktop.
3. Re-verify the latest runtime changes in production after Vercel build capacity becomes available.
4. Reconcile the documented production Supabase migration provenance/bootstrap mismatch tracked separately in issue #26.
