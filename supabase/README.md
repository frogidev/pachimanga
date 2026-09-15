# Supabase schema and migration provenance

Pachimanga production uses Supabase project `gwpgaojsemcfikgynxwv`. This directory contains historical SQL used during development, but it is not currently a complete fresh-project Supabase CLI bootstrap.

## Production migration history

Verified against production on 2026-09-15:

| Version | Name | Purpose |
| --- | --- | --- |
| `20260913122954` | `initial_pachimanga_user_sync` | Creates the current account-sync baseline: `profiles`, `library_entries`, `reading_progress`, `user_settings`, RLS, policies, grants, and supporting constraints/indexes. |
| `20260913124558` | `pachimanga_sync_history` | Adds `reading_history` and supplemental synchronization indexes/policies. |
| `20260915053221` | `drop_redundant_library_index` | Removes redundant standalone `library_entries_user_source_manga_idx` while retaining the unique constraint-backed index used by library upserts. |

Production currently has RLS enabled on `profiles`, `library_entries`, `reading_progress`, `reading_history`, and `user_settings`.

## Repository files

The numbered SQL files in `supabase/migrations/` predate the canonical production migration sequence:

- `001_auth_library.sql` is an older bootstrap centered on `user_library`; it does not represent the current production baseline.
- `002_sync_tables.sql` assumes current synchronization tables already exist and therefore is not independently replayable from an empty database.
- `003_drop_redundant_library_index.sql` corresponds to the production duplicate-index cleanup.

Do not rewrite or delete `001` or `002` to make history appear cleaner. Treat them as historical artifacts until migration provenance is deliberately reconciled.

## Important restriction

Do not run `supabase db reset` or treat this directory as a safe clean-room bootstrap until issue #26 is resolved and a canonical local/test baseline has been established.

There is currently no committed `supabase/config.toml`. Adding one alone does not make the historical migration set replayable.

## Safe schema-change workflow

For future schema changes:

1. Verify current production schema and migration history first.
2. Add a new forward-only migration; never edit an already-applied production migration.
3. Preserve RLS and `auth.uid()` ownership policies for every account-owned table.
4. Preserve unique constraints/conflict targets used by application upserts.
5. Validate the new migration in a disposable/local Supabase environment once the canonical bootstrap is available.
6. Apply production migrations only when production mutation is explicitly intended.
7. Re-run Supabase security/performance advisors and relevant application tests afterward.

## Current tracked follow-ups

- GitHub issue #26: reconcile repository migration provenance and define a reproducible local/test bootstrap.
- GitHub issue #14: enable Supabase leaked-password protection in Auth settings; this is an account-level Auth configuration change, not SQL migration work.

Until those are resolved, production schema inspection is authoritative for current state and `docs/architecture.md` / `docs/verification-2026-09-15.md` describe the active data/security boundaries.
