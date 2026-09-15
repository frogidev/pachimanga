---
name: pachimanga-supabase
description: Strict Supabase/auth/RLS/schema/sync/account-storage workflow for Pachimanga. Use for migrations, auth flows, RLS/policies, library/progress/history/settings persistence, cache ownership, offline outbox, production advisors, or cross-device sync. Requires append-only migrations, explicit conflict semantics, account-isolation tests, and clear separation between code authoring and production mutation. Never disable RLS or perform destructive/production changes without explicit user intent.
---

# Pachimanga Supabase and account data

Treat RLS and account-bound local storage as security boundaries.

Read `AGENTS.md`, `docs/architecture.md`, and the relevant `docs/WORKPLAN.md` phase before changing auth/data behavior.

## First classify the task

Determine whether the request is:

1. code/migration authoring only;
2. production inspection/advisor review;
3. non-destructive production configuration change;
4. production schema mutation;
5. destructive data/schema/auth change.

Do not infer permission for 3–5 from a request for 1–2.

## Schema/migration rules

- Inspect existing migrations first.
- Add a new migration for schema changes.
- Never rewrite already-applied migration history.
- Preserve unique constraints/conflict targets used by application upserts.
- Use idempotent guards only when they improve safe repeated application and do not hide an unexpected schema state.
- Re-run security/performance advisors after production schema changes.
- Record exactly what was applied and to which environment.

Known library-index cleanup:

- keep `library_entries_user_id_source_id_manga_id_key` because it backs the unique constraint;
- drop only redundant standalone `library_entries_user_source_manga_idx` after re-verifying production state.

## RLS/account isolation

For every account-owned table:

- RLS remains enabled;
- policy ownership uses the authenticated user's identity;
- application queries are also scoped to the current user where appropriate;
- a client-supplied `user_id` must not grant access to another account;
- no service-role key is shipped to browser code.

Current synchronized tables:

- `profiles`
- `library_entries`
- `reading_progress`
- `reading_history`
- `user_settings`

## Local cache ownership

`src/lib/storage/reader-storage.ts` binds cache state to the current authenticated user.

When changing local persistence verify:

- logout cleanup;
- same-browser A -> B account switch;
- B -> A switch;
- legacy key cleanup;
- pending offline data cannot be flushed under the wrong user.

Never create an anonymous fallback cache that bypasses the account model.

## Sync/conflict design

Before changing synchronization, write down:

- authoritative record/source;
- conflict key;
- conflict winner;
- timestamp semantics;
- idempotency behavior;
- offline behavior;
- reconnect behavior;
- cross-device stale-write behavior;
- account-switch behavior.

Current progress/history writes use a local IndexedDB outbox before Supabase retry. Do not assume library/settings have the same offline guarantees.

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
- using service-role privileges for a task that should work through normal account policies.

Before a destructive change, identify rollback/recovery strategy and scope.

## Validation

For code changes run the normal web gate:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

For production schema changes additionally:

- inspect applied migration state;
- verify representative application upsert/read/delete paths;
- re-run Supabase advisors;
- test with at least two accounts when ownership/isolation changed.

Never report an advisor/schema result that was not actually inspected.