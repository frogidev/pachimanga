# Production verification snapshot — 2026-09-15

This file records concrete verification evidence from the current PWA release-hardening pass. It is a dated snapshot, not a replacement for `WORKPLAN.md` or live production checks.

## Repository and CI

Verified during this pass:

- `main` reached `973feba1aa8f308b905955f7ade526a022f25c26` after the offline/account-sync hardening merge.
- `Repository Hygiene` runs on every pull request and every push to `main`.
- The `main` push for `973feba...` passed `Repository Hygiene` and `Web Quality`.
- `Web Quality` includes unit tests, lint, typecheck, and a production Next.js build.
- Active `checkout`/`setup-node` actions were upgraded to v7 while the project runtime remains Node 22.
- GitHub still has no repository ruleset for `main`; administration work is tracked in issue #10.

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
- Enabling leaked-password protection requires an Auth/admin setting not exposed by the connected tools; tracked in issue #14.

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

## Sync/account hardening

Merged in PR #22:

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

The most recent confirmed production deployment before the sync merge was READY for `0942182fe2e9cfb29867ad5f0d28095d7fff2217`.

The Vercel status attached to `973feba1aa8f308b905955f7ade526a022f25c26` currently reports failure with `upgradeToPro=build-rate-limit`. GitHub application CI is green; this is a Vercel Hobby build-rate-limit condition, not an application compile/test failure.

Do not claim the sync hardening is live in production until a production deployment for `973feba...` or a later descendant reaches READY and receives a post-deploy smoke check.

## Remaining external/manual blockers

The following cannot be completed through the currently connected automation without additional account-level action or real test credentials/devices:

1. Enable GitHub `main` branch protection/ruleset — issue #10.
2. Enable Supabase leaked-password protection — issue #14.
3. Complete fresh-account email confirmation/password-reset and two-account/two-device production E2E using real accounts.
4. Complete real-device installed-PWA validation across iOS/iPadOS/Android/desktop.
5. Re-verify production runtime after the Vercel build-rate limit clears and the current `main` deployment reaches READY.
