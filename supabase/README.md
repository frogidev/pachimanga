# Supabase schema and migration provenance

Pachimanga production uses Supabase project `gwpgaojsemcfikgynxwv`. The active migration chain in `supabase/migrations/` mirrors production migration history and is the canonical clean-room bootstrap for local/test Supabase environments.

## Production migration history

Verified against production on 2026-09-15 and rechecked as healthy on 2026-09-16:

| Version | Name | Purpose |
| --- | --- | --- |
| `20260913122954` | `initial_pachimanga_user_sync` | Creates `profiles`, `library_entries`, `reading_progress`, `user_settings`, owner RLS policies, grants, constraints, and identity sequences. |
| `20260913124558` | `pachimanga_sync_history` | Adds `reading_history` plus supplemental synchronization indexes and owner policies. |
| `20260915053221` | `drop_redundant_library_index` | Removes redundant `library_entries_user_source_manga_idx` while retaining the unique constraint-backed library upsert index. |
| `20260915080009` | `revoke_anon_account_table_privileges` | Removes anonymous table privileges and prevents future public-table auto-grants to `anon`. |
| `20260915080109` | `tighten_account_role_privileges` | Removes anonymous sequence access and reduces `authenticated` table/sequence grants to the privileges required by Pachimanga. |
| `20260915081911` | `reject_stale_sync_writes` | Adds server-side before-update guards so older/equal progress, history, or settings timestamps cannot replace a newer stored value. |

Production RLS is enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`.

The production account-data role contract is:

- `anon`: no table or identity-sequence privileges on Pachimanga account tables;
- `authenticated`: `SELECT/INSERT/UPDATE` on `profiles` and `user_settings`; `SELECT/INSERT/UPDATE/DELETE` on library/progress/history; `USAGE/SELECT` on identity sequences;
- row ownership is enforced by RLS policies using `auth.uid()`; grants do not replace RLS.

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
- settings upserts request the stored server row back so local cache can reconcile when the stale-write trigger preserves a newer remote value.

Library add/remove remains remote-first and does not currently use an offline mutation queue.

Client timestamps remain the ordering signal for progress/history/settings, so real two-device validation should still observe clock-skew behavior before release-candidate status.

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

Expected baseline versions are the six production versions listed above. Future forward migrations may add later versions.

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
5. Grant only the minimum Data API privileges required by the authenticated application; do not restore anonymous table/sequence grants.
6. Preserve unique constraints/conflict targets used by application upserts.
7. Preserve the stale-write trigger contract unless a replacement conflict model is deliberately designed and tested.
8. Verify the clean local chain with `supabase db reset` when a local Docker environment is available.
9. Run application tests/lint/typecheck/build for application-impacting changes.
10. Apply production migrations only when production mutation is explicitly intended.
11. Re-inspect grants/RLS/triggers and rerun Supabase security/performance advisors after production DDL.

## Current advisor state

As of the latest 2026-09-16 check:

- performance advisor: no lints;
- security advisor: one warning, leaked-password protection disabled.

The current Supabase plan does not include leaked-password protection, so that warning is accepted/documented rather than treated as a release blocker. Mandatory authentication, owner-scoped RLS, account-bound local storage/outboxes, restricted redirects, and publishable-key-only browser access remain the compensating controls.