---
name: pachimanga-supabase
description: Supabase, authentication, database, RLS, migration, sync, and account-owned storage work for Pachimanga. Use when changing schema, migrations, auth flows, user data synchronization, library/progress/history/settings persistence, cache ownership, or database security. Preserve mandatory accounts and strict user isolation; never make destructive production data changes without explicit approval.
---

# Pachimanga Supabase and Account Data

Treat Supabase RLS and owner-bound local caches as security boundaries, not convenience layers.

## Procedure

1. Read `AGENTS.md`, `docs/WORKPLAN.md`, existing migrations, and the affected storage/auth code before changing schema or behavior.
2. Confirm whether the task is local migration authoring, production inspection, or production mutation. Do not infer permission to mutate production from a request to edit code.
3. Make schema changes as new migrations. Do not rewrite already-applied migration history.
4. Keep every account-owned table scoped to the authenticated user and covered by appropriate RLS policies.
5. Preserve unique constraints and conflict targets used by application upserts. If removing a duplicate index, drop only the redundant non-constraint index.
6. Keep auth redirects restricted to intended production/local development URLs. Do not add guest or anonymous application access.
7. Keep local IndexedDB/localStorage data bound to the current authenticated user and clear/rebind safely across logout and account switches.
8. For sync changes, define timestamp/conflict semantics explicitly and test account switching plus cross-device ordering where practical.
9. Never expose service-role keys, relay tokens, or other server-only secrets to client code or committed files.
10. Validate migrations and application checks locally. If production advisors or schema state cannot be inspected from the local environment, state that limitation instead of guessing.

## Production safety

Require explicit user intent before any of the following:

- applying a production migration,
- dropping or truncating production objects,
- changing production auth settings,
- disabling RLS,
- deleting or rewriting user data.
