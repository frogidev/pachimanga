---
name: pachimanga-supabase
description: Strict Supabase/auth/RLS/schema/sync/account-storage workflow for Pachimanga. Use for migrations, auth flows, RLS/policies, library/progress/history/settings persistence, cache ownership, offline outbox, production advisors, or cross-device sync. Requires append-only canonical migrations, least-privilege grants, newer-only timestamp conflict semantics, account-isolation tests, and clear separation between code authoring and production mutation. Never disable RLS or perform destructive/production changes without explicit user intent.
---

# Pachimanga Supabase and account data

Treat RLS, database grants, timestamp-conflict guards, and account-bound local storage as security/data-integrity boundaries.

Read `AGENTS.md`, `docs/architecture.md`, `supabase/README.md`, and the relevant `docs/WORKPLAN.md` phase before changing auth/data behavior.

## First classify the task

Determine whether the request is:

1. code/migration authoring only;
2. production inspection/advisor review;
3. non-destructive production configuration change;
4. production schema mutation;
5. destructive data/schema/auth change.

Do not infer permission for 3–5 from a request for 1–2. A broad explicit instruction to continue production hardening can authorize a non-destructive hardening migration, but destructive data/schema/auth changes still require the destructive scope to be explicit.

## Canonical migration contract

`supabase/migrations/` is the active timestamped production migration chain and must remain replayable from a clean local Supabase environment.

`supabase/legacy-migrations/` contains preserved pre-canonical SQL artifacts only. Never move those files back into `supabase/migrations/`, replay them with `db reset`, or edit them to make history look cleaner.

Required rules:

- inspect `supabase/README.md` and current production migration history first;
- every active migration uses a 14-digit Supabase timestamp prefix;
- add a new forward migration for every production schema/grant/trigger change;
- never rewrite an already-applied production migration;
- never use `supabase db reset --linked` against production;
- preserve unique constraints/conflict targets used by application upserts;
- preserve newer-only timestamp conflict triggers unless deliberately replaced with an equivalent or stronger model;
- use idempotent guards only when they improve safe repeated application and do not hide an unexpected schema state;
- re-run security/performance advisors after production DDL;
- record exactly what was applied and to which environment.

Current production baseline starts with:

- `20260913122954_initial_pachimanga_user_sync.sql`
- `20260913124558_pachimanga_sync_history.sql`
- `20260915053221_drop_redundant_library_index.sql`
- `20260915080009_revoke_anon_account_table_privileges.sql`
- `20260915080109_tighten_account_role_privileges.sql`
- `20260915081911_reject_stale_sync_writes.sql`

The current production chain also includes `20260919234900_tracker_links.sql` and `20260919235000_source_migration_rpc.sql`. Future migrations append after these; do not renumber applied history.

## Least-privilege Data API contract

Pachimanga has no anonymous application data API.

For current account tables:

- `anon` has no table privileges;
- `anon` has no privileges on Pachimanga identity sequences;
- `authenticated` has `SELECT/INSERT/UPDATE` on `profiles` and `user_settings`;
- `authenticated` has `SELECT/INSERT/UPDATE/DELETE` on `library_entries`, `reading_progress`, and `reading_history`;
- `authenticated` has `USAGE/SELECT` on identity sequences required for inserts;
- default privileges must not silently auto-expose future public tables/sequences to `anon` or `authenticated`; future migrations grant the exact access they need explicitly.

Do not confuse grants with RLS. Grants decide whether the role can reach an object; RLS still decides which rows it can access.

## RLS/account isolation

For every account-owned table:

- RLS remains enabled;
- policy ownership uses the authenticated user's identity;
- application queries are also scoped to the current user where appropriate;
- a client-supplied `user_id` must not grant access to another account;
- no service-role/secret key is shipped to browser code.

Current synchronized/account-owned tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`
- `library_collections`
- `library_collection_items`
- `tracker_links`

Known library-index invariant:

- keep `library_entries_user_id_source_id_manga_id_key` because it backs the unique constraint used by upserts;
- do not restore redundant `library_entries_user_source_manga_idx`.

## Local cache ownership

`src/lib/storage/reader-storage.ts` binds cache state to the current authenticated user.

When changing local persistence verify:

- logout cleanup;
- same-browser A -> B account switch;
- B -> A switch;
- legacy key cleanup;
- pending offline data cannot be flushed under the wrong user.

Never create an anonymous fallback cache that bypasses the account model.

## Sync/conflict contract

Current production timestamp ordering is newer-only at both client reconciliation and the database update boundary.

Authoritative ordering fields:

- `reading_progress.updated_at`
- `reading_history.read_at`
- `user_settings.updated_at`

For an existing row, an incoming update may replace it only when the incoming ordering timestamp is strictly newer. Older writes and exact ties preserve the already-stored row. Inserts are unaffected. Trigger helper functions are not RPC-executable by `anon` or `authenticated`.

This contract exists specifically to prevent delayed offline/cross-device requests from rolling state backward merely because they arrive later. Do not weaken it by changing the comparison to arrival order or by removing the triggers without a replacement design.

Current client behavior:

- progress/history writes use an owner-bound IndexedDB outbox before Supabase retry;
- the outbox store is keyed by chapter ID, so multiple pending saves for the same chapter collapse to the latest local value;
- cached vs remote progress chooses the newer `updatedAt`, with remote winning an exact tie;
- library add/remove remains remote-first and is intentionally not offline queued;
- reader settings are account-bound locally and async-upserted, but do not yet have an eventual-delivery outbox.

Before changing synchronization, write down:

- authoritative record/source;
- conflict key;
- conflict winner;
- timestamp semantics;
- idempotency behavior;
- offline behavior;
- reconnect behavior;
- cross-device stale-write behavior;
- account-switch behavior;
- whether device clock skew materially affects the proposal.

Do not assume library/settings have the same offline guarantees as progress/history.

## Auth changes

Verify:

- production/local redirect allowlist;
- anonymous protected-route behavior;
- registration/confirmation;
- sign-in/sign-out;
- reset/recovery when touched;
- private/no-store behavior;
- cache-owner rebinding after sign-out/switch.

Do not add guest/anonymous normal app access.

## Production mutation hard gate

Require explicit user intent before:

- applying a production migration;
- dropping/truncating objects;
- deleting/rewriting user data;
- changing production auth/security settings;
- disabling/altering RLS in a way that could broaden access;
- removing stale-write guards in a way that could permit data rollback;
- using service-role privileges for a task that should work through normal account policies.

Before a destructive change, identify rollback/recovery strategy and scope. A security hardening change must not be used as a pretext to mutate user data.

## Validation

For code changes run the normal web gate:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

For migration-chain changes additionally:

- run repository hygiene tests that guard canonical timestamped migrations;
- when a local Docker environment is available, run `supabase start` then `supabase db reset` and `supabase migration list --local`;
- compare local migration versions to production history before any `db push`.

For production schema/grant/trigger changes additionally:

- inspect applied migration state;
- inspect table/sequence privileges for `anon` and `authenticated`;
- confirm RLS remains enabled on every account table;
- inspect affected triggers/functions and verify their execution exposure;
- verify representative application upsert/read/delete paths when credentials are available;
- re-run Supabase security and performance advisors;
- test with at least two accounts/devices when ownership or conflict behavior changed.

Never report an advisor/schema/grant/trigger result that was not actually inspected.
