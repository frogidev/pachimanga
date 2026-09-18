# Supabase schema and migration provenance

Pachimanga production uses Supabase project `gwpgaojsemcfikgynxwv`. The active migration chain in `supabase/migrations/` mirrors production migration history and is the canonical clean-room bootstrap for local/test Supabase environments.

## Production migration history

Verified against production through the v0.4.0 release on 2026-09-18:

| Version | Name | Purpose |
| --- | --- | --- |
| `20260913122954` | `initial_pachimanga_user_sync` | Creates `profiles`, `library_entries`, `reading_progress`, `user_settings`, owner RLS policies, grants, constraints, and identity sequences. |
| `20260913124558` | `pachimanga_sync_history` | Adds `reading_history` plus supplemental synchronization indexes and owner policies. |
| `20260915053221` | `drop_redundant_library_index` | Removes redundant `library_entries_user_source_manga_idx` while retaining the unique constraint-backed library upsert index. |
| `20260915080009` | `revoke_anon_account_table_privileges` | Removes anonymous table privileges and prevents future public-table auto-grants to `anon`. |
| `20260915080109` | `tighten_account_role_privileges` | Removes anonymous sequence access and reduces `authenticated` table/sequence grants to the privileges required by Pachimanga. |
| `20260915081911` | `reject_stale_sync_writes` | Adds server-side before-update guards so older/equal progress, history, or settings timestamps cannot replace a newer stored value. |
| `20260916165443` | `add_library_state_tracking` | Adds account-owned reading status plus publication/chapter-update tracking fields and validation checks to `library_entries`. |
| `20260917024919` | `add_library_progress_summary_rpc` | Adds an account-bound `SECURITY INVOKER` aggregate RPC that returns one progress/history summary row per library title. |
| `20260917024951` | `restrict_library_progress_summary_rpc` | Explicitly removes `anon`/`PUBLIC` execute access from the summary RPC while retaining `authenticated` execute access. |
| `20260917030319` | `restrict_library_progress_summary_rpc` | Reasserts authenticated-only execute grants for the summary RPC in canonical production history. |
| `20260918010000` | `pwa_collections_profile_and_clear_rpc` | Adds `profiles.avatar_url`, owner-scoped collections/memberships, authenticated grants/RLS, and transactional `clear_my_library()`. |

Production RLS is enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, `user_settings`, `library_collections`, and `library_collection_items`.

The production account-data role contract is:

- `anon`: no table or identity-sequence privileges on Pachimanga account tables and no execute access to the library summary RPC;
- `authenticated`: required `SELECT/INSERT/UPDATE` access on profile/settings, required library/progress/history privileges, owner-scoped collection privileges, `USAGE/SELECT` on required identity sequences, and execute access only to the intended account-bound RPCs;
- row ownership is enforced by RLS policies using `auth.uid()`; grants do not replace RLS.

## Library state tracking and summary loading

`library_entries` keeps synchronized account-owned reading state separately from provider publication metadata. Migration `20260916165443_add_library_state_tracking.sql` adds `reading_status`, `reading_status_manual`, `publication_status`, provider chapter-baseline/update fields, and non-negative count checks while preserving the existing owner RLS policies and unique `(user_id, source_id, manga_id)` upsert constraint.

The Library dashboard normally uses `get_library_progress_summaries()` rather than downloading every `reading_progress` row. The function accepts no parameters, is `SECURITY INVOKER`, filters on `auth.uid()`, and aggregates only rows visible to the active authenticated account. It returns progress percentage/completion counts plus synchronized history timestamps. The chapter-row paginator remains a bounded fallback if the RPC is unavailable.

Production migrations `20260917024919_add_library_progress_summary_rpc.sql` and `20260917024951_restrict_library_progress_summary_rpc.sql` were applied before client adoption. Post-migration verification confirmed `anon` execute = false, `authenticated` execute = true, and `prosecdef = false`.

## Server-side timestamp conflict contract

Timestamped account synchronization is last-newer-write-wins at the database boundary:

- `reading_progress.updated_at`: an incoming `UPDATE` is accepted only when its timestamp is strictly newer than the stored row;
- `reading_history.read_at`: an incoming history update is accepted only when `read_at` is strictly newer;
- `user_settings.updated_at`: an incoming settings update is accepted only when its timestamp is strictly newer;
- older writes and exact timestamp ties keep the already-stored row;
- inserts are unaffected;
- trigger helper functions are not executable through `anon` or `authenticated` RPC access.

This prevents a delayed offline device from rolling remote state backward merely because its request arrived later. It does not remove the need for owner RLS or account-bound client storage.

## Client synchronization relationship

The current client complements the database guards with owner-bound local retry state:

- reading progress is written locally first and queued in an IndexedDB progress outbox owned by the active user;
- reader settings are cached under an account-specific localStorage key and queued in an IndexedDB settings outbox owned by the active user;
- both outboxes flush on save and on authenticated boot/reconnect;
- legacy, unowned, and cross-account outbox entries are discarded rather than replayed under another account;
- settings upserts request the stored server row back so local cache can reconcile when the stale-write trigger preserves a newer remote value;
- the shell and Settings expose queue/network state as Synced, Syncing/pending, or Offline rather than claiming synchronization unconditionally.
- sync-status surfaces share a visibility-aware observer and use IndexedDB count-only queries for pending outboxes; this is a client efficiency change and does not alter server ownership, timestamp, or RLS semantics.

Library add/remove uses an owner-bound IndexedDB `libraryOutbox`; pending mutations are reconciled with remote snapshots so reconnect cannot visually undo unsynced local intent. Library reading status and provider-update metadata are stored in the same owner-RLS-protected `library_entries` row. Pending progress outbox writes suppress automatic status persistence from a potentially stale aggregate until the queue has flushed.

Client timestamps remain part of the ordering model, with logical-device clock hardening in the v0.4.0 client. Real two-device/near-simultaneous behavior remains post-release validation evidence.

## Repository layout

- `config.toml` — local Supabase project configuration, pinned to Postgres 17 with migrations enabled.
- `migrations/` — active timestamped migration chain. This is the only migration directory that `supabase db reset` should replay.
- `legacy-migrations/` — preserved pre-canonical SQL artifacts (`001`/`002`/`003`). They are provenance only and must never be copied back into the active migration chain.

The legacy files were moved without rewriting their contents. They do not correspond one-for-one with production migration history and are intentionally excluded from local resets and future `db push` operations.

## Local clean-room bootstrap

Prerequisites: Docker-compatible runtime and a current Supabase CLI.

From the repository root:

```bash
supabase start
supabase db reset
```

`db reset` is local by default and replays only `supabase/migrations/`. `supabase/config.toml` disables seed execution because Pachimanga does not commit production-derived user data or credentials.

After reset:

```bash
supabase migration list --local
```

Expected baseline versions are the eleven production versions listed above. Future forward migrations may add later versions.

Do not use `supabase db reset --linked` against production. It is destructive.

## Linking to production

Only link when intentionally inspecting or deploying database changes:

```bash
supabase login
supabase link --project-ref gwpgaojsemcfikgynxwv
supabase migration list --linked
```

Before a production push, review pending migrations and SQL. Production mutation requires explicit intent under `AGENTS.md` and `.hermes/skills/pachimanga-supabase/SKILL.md`.

## Safe schema-change workflow

1. Start from current `main` and read `AGENTS.md`, `docs/WORKPLAN.md`, `docs/architecture.md`, and the Supabase Hermes skill.
2. Inspect current production schema, migration history, RLS, grants, triggers, and advisors before changing account-data behavior.
3. Create a new timestamped forward migration; never edit an applied production migration.
4. Keep RLS enabled and preserve `auth.uid()` owner policies for account-owned tables.
5. Grant only the minimum Data API privileges required by the authenticated application; do not restore anonymous table/sequence/function grants.
6. Preserve unique constraints/conflict targets used by application upserts.
7. Preserve the stale-write trigger contract unless a replacement conflict model is deliberately designed and tested.
8. Verify the clean local chain with `supabase db reset` when a local Docker environment is available.
9. Run application tests/lint/typecheck/build for application-impacting changes.
10. Apply production migrations only when production mutation is explicitly intended.
11. Re-inspect grants/RLS/triggers/functions and rerun Supabase security/performance advisors after production DDL.

## Current advisor state

As of the 2026-09-18 post-migration/release check:

- security advisor: known leaked-password-protection warning remains;
- performance advisor: the new collection lookup index was reported unused while the new collection tables had no rows.

The leaked-password-protection warning is accepted/documented under the current plan rather than treated as evidence that owner RLS or account isolation is absent. An unused-index advisory immediately after adding empty tables is tracked as usage evidence, not a reason to remove the ownership lookup index without workload data.

## v0.4.0 release data-model note

Production migration `20260918010000_pwa_collections_profile_and_clear_rpc.sql` is applied. `profiles` is the canonical personalization row for `display_name` and `avatar_url`; Auth metadata remains a compatibility mirror. Collections are owner-RLS protected, and `clear_my_library()` is `SECURITY INVOKER`, authenticated-only, and operates on the current `auth.uid()`.

## 2026-09-17 PR #68 note

PR #68 introduced no Supabase schema, migration, RLS, grant, or service-role changes. Its account/profile/security UI continues to use authenticated Supabase APIs under the existing ownership model, and its sync/provider performance changes are client/runtime optimizations only.
