# Production verification snapshot — 2026-09-15

This file records concrete verification evidence from the current PWA release-hardening pass. It is a dated snapshot, not a replacement for `WORKPLAN.md` or live production checks.

## Repository and CI

Verified during this pass:

- `main` reached `e00974437eda3c5b54e2e4e78ea60091b4898045` after PR #35.
- `Repository Hygiene` runs on every pull request and every push to `main`.
- `Web Quality` runs on every pull request and every push to `main`, so its `quality` result is a stable required check.
- For hosted-runtime changes, Web Quality runs unit tests, lint, typecheck, and a production Next.js build on Node 22.
- For docs/agent/native-only changes, Web Quality still reports `quality` while skipping unnecessary npm/build work.
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

PR #33 made `quality` an always-present safe merge check. PR #34 verified the docs-only path. Issue #10 is closed as completed.

Vercel is intentionally not a universal required check because hosting-plan quota failures can be independent of application CI. Native Quality is intentionally not universal because it remains path-sensitive and native release workflows remain manual-only.

## Supabase production state

Project: `gwpgaojsemcfikgynxwv`.

Verified on 2026-09-15:

- project state is healthy;
- RLS is enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`;
- policies remain authenticated-user/owner scoped;
- redundant `library_entries_user_source_manga_idx` is absent;
- retained library upsert constraint/index is `library_entries_user_id_source_id_manga_id_key`;
- performance advisor returns no lints;
- security advisor reports only leaked-password protection, which is unavailable on the current plan and is accepted/documented rather than a release blocker.

### Migration provenance reconciliation

Production migration history is now represented by the canonical timestamped files under `supabase/migrations/`:

- `20260913122954_initial_pachimanga_user_sync.sql`
- `20260913124558_pachimanga_sync_history.sql`
- `20260915053221_drop_redundant_library_index.sql`
- `20260915080009_revoke_anon_account_table_privileges.sql`
- `20260915080109_tighten_account_role_privileges.sql`

The earlier `001`/`002`/`003` repository SQL is preserved unchanged under `supabase/legacy-migrations/` and is no longer in the active reset/push chain. `supabase/config.toml` establishes a Postgres 17 local project with migrations enabled and seed execution disabled.

Repository hygiene now guards timestamped active migrations, the required canonical baseline files, the absence of obsolete `public.user_library` from active migrations, and the presence of the preserved legacy artifacts.

### Least-privilege production hardening

Two non-destructive production migrations were applied with explicit continuation authority from the owner:

1. `20260915080009 revoke_anon_account_table_privileges`
   - revoked all `anon` table privileges in `public`;
   - revoked future default public-table privileges from `anon`.
2. `20260915080109 tighten_account_role_privileges`
   - revoked `anon` identity-sequence privileges;
   - removed broad/default table and sequence privileges from `authenticated`;
   - re-granted only the Pachimanga operations required by the authenticated app;
   - revoked future default table/sequence auto-grants to `anon` and `authenticated`.

Post-change verification observed:

- `anon` has no table privileges on the five Pachimanga account tables;
- `anon` has no `USAGE`/`SELECT` privilege on the three identity sequences;
- `authenticated` has `SELECT/INSERT/UPDATE` on `profiles` and `user_settings`;
- `authenticated` has `SELECT/INSERT/UPDATE/DELETE` on `library_entries`, `reading_progress`, and `reading_history`;
- `authenticated` retains `USAGE/SELECT` on identity sequences needed for inserts;
- all five account tables still have RLS enabled;
- performance advisor remains clean;
- security advisor still contains only the accepted leaked-password warning.

No user rows were inserted, updated, deleted, truncated, or rewritten by this hardening.

## Anonymous production access

Anonymous requests were previously verified against representative protected routes including:

- `/`
- `/library`
- `/browse`
- `/import`
- `/api/source/weebcentral/status`

Observed behavior:

- requests resolve to the authentication experience rather than protected application content;
- session-enforced responses use `Cache-Control: private, no-store`;
- there is no guest/demo fallback.

Only `/auth...` and `/offline` are intentionally public application paths.

## WeebCentral relay

The relay container image is `ghcr.io/frogidev/pachimanga-weebcentral-relay:latest` and the application expects the relay service on local port `127.0.0.1:8787` behind the Cloudflare tunnel.

Operator follow-up on 2026-09-15:

- the Portainer `pachimanga-relay` stack was updated/redeployed;
- `pachimanga-weebcentral-relay` reports `healthy` in Portainer;
- the existing relay token was retained rather than rotated;
- the Cloudflare relay path was checked as part of the operator rollout.

The authenticated application route for relay status remains intentionally behind the account boundary.

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

Vercel build capacity resumed during this pass. Production deployment `dpl_d95bUQkfvBoL8oNy2rs7RvQ7b9uU` reached `READY` for `33866e3700ebbe86518f0648db32d1d6e309a58a` (`main`, PR #33).

Later commits through `e009744...` are documentation/verification-only, so `33866e...` remains the latest confirmed hosted-runtime tree from this sequence.

A seven-day grouped runtime-error check found one historical provider/network error cluster: two `TypeError: fetch failed` occurrences on `/manga/[id].rsc` from deployment `dpl_88AXMSpWz9UvjfJhFqkLDhnY2BLC`, caused by an upstream socket closing. This is provider/network reliability evidence to cover in the source smoke/retry phase, not an auth/database failure.

The repository contains ignored-build handling so non-runtime-only changes do not intentionally consume Vercel builds.

## Remaining external/manual blockers

The remaining work requiring real identities/devices is intentionally narrow:

1. complete fresh-account email confirmation/password-reset and two-account/two-device production E2E using real accounts;
2. complete installed-PWA validation across iOS/iPadOS/Android/desktop.

Remaining repository/application work can proceed autonomously: provider reliability, reader/import validation, explicit sync conflict semantics, browser E2E coverage, performance/observability cleanup, workplan evidence, and final release-candidate review.
