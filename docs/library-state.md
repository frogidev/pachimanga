# Library state, progress, and chapter updates

Release baseline: v1.0.2. Exact release SHA and production deployment are recorded in `verification-release-2026-09-19.md`; the underlying library data model is carried forward from the v0.4.0 migration baseline.

Pachimanga keeps provider publication state, personal reading state, chapter progress, and provider update baselines as separate concepts.

## Publication status

`Manga.status` / `library_entries.publication_status` describe the source series:

- `ongoing`
- `complete`
- `hiatus`
- `cancelled`
- `unknown`

This comes from provider metadata and is independent from whether the signed-in user has finished reading the title.

## Personal reading status

`library_entries.reading_status` describes the signed-in user's state:

- `plan_to_read`
- `reading`
- `completed`
- `on_hold`
- `dropped`

When `reading_status_manual = false`, automatic state derives from progress:

- 0% -> Plan to Read;
- partial progress -> Reading;
- all known chapters complete -> Completed.

A deliberate user choice sets `reading_status_manual = true` and is not overwritten by automatic progress. Returning to Automatic restores progress-derived behavior.

A title may therefore correctly be both provider `complete` and user `Completed`.

## Dynamic manga progress

Library percentage is derived from account-owned `reading_progress` against the current known chapter count. Partial chapter progress contributes proportionally. Mark read/unread and natural Reader progress write the same model.

Legacy/imported 100% summaries are preserved while no detailed synchronized chapter rows exist so older completed titles are not incorrectly reset.

## Compact dashboard summaries

The normal Library path calls `get_library_progress_summaries()` rather than hydrating every chapter-progress row.

Security/ownership properties:

- no user ID parameter;
- `SECURITY INVOKER`;
- filters on `auth.uid()`;
- no `anon`/`PUBLIC` execute privilege;
- `authenticated` execute only;
- underlying owner RLS remains authoritative.

The deterministic paginated progress loader remains a fallback. Only a complete snapshot may drive automatic status reconciliation.

## Logout/login rehydration regression

A previous Library reconstruction path fetched all `reading_progress` in a single Supabase Data API response. Large accounts could exceed the response page size, causing missing rows to be interpreted as unread state after logout cleared local cache.

The synchronized data itself was not deleted. The fix now:

- collects detailed fallback progress deterministically across API pages;
- enforces a bounded safety limit;
- fails instead of accepting a partial snapshot;
- preserves stored/account-bound status if progress reconstruction is incomplete.

Regression coverage includes multi-page collection, partial-fetch failure, and safety-limit behavior.

## Pending local progress protection

If a title has an owner-bound pending progress outbox entry, the dashboard avoids persisting a new automatic status from a potentially stale server aggregate until the queue resolves. Local summary state remains visible meanwhile.

## Synchronization visibility

Current shell/Settings states are driven by real owner-bound queues:

- `Synced`;
- `Syncing · N pending`;
- `Offline`;
- `Offline · N pending`.

Settings exposes explicit `Sync now` and `Retry pending sync` controls. They flush the same account-bound progress/settings queues used by reconnect handling; they do not bypass ownership checks or create a separate sync model.

## Provider chapter-update tracking

Authenticated `/api/library/refresh` resolves the stored source ID through the production registry and records:

- publication status;
- chapter count;
- latest chapter ID/number;
- provider publication timestamp when available;
- last checked time;
- last observed chapter-change time;
- new chapter count.

First refresh establishes a baseline and does not mark the entire existing catalog as new. Later growth increments `new_chapter_count`. Opening the title acknowledges new chapters.

Library supports:

- Recently Updated by actual chapter activity;
- Last Read;
- Progress;
- Recently Added;
- Title A-Z;
- Unread Updates filter;
- Continue Reading;
- grid/compact density;
- incremental rendering for larger collections;
- per-title manual chapter refresh with last-checked state.

`/updates` also exposes live account/provider availability and bounded deliberate `Check all now` refresh behavior; it does not use aggressive background polling.

## User collections

The v1.0.2 Library retains owner-scoped user collections. `library_collections` stores names and `library_collection_items` binds existing library rows into those collections using composite ownership foreign keys. Both tables have RLS enabled and authenticated owner policies. Deleting a collection removes only membership rows; deleting a library entry cascades its collection memberships.

Collection state is synchronized with Supabase rather than becoming a separate anonymous/local library.

## Provider failure behavior

Refresh/provider failures do not fabricate chapters, erase the previous baseline, or fall back to mock data. Provider/offline/network failures, `403`, `429`, relay-unavailable, missing-content, and generic upstream errors remain explicit with safe retry behavior where appropriate. A successful zero-result state is not used as a substitute for a failed provider check.

## Relevant production migrations

- `20260916165443_add_library_state_tracking.sql`
- `20260917024919_add_library_progress_summary_rpc.sql`
- `20260917024951_restrict_library_progress_summary_rpc.sql`
- `20260917030319_restrict_library_progress_summary_rpc.sql`
- `20260918010000_pwa_collections_profile_and_clear_rpc.sql`

Post-migration verification confirmed owner RLS/upsert constraints/grants remained intact, summary RPC `anon` execute was removed, performance advisor was clean, and leaked-password protection remained the accepted plan-limited warning.

## Historical v0.4.0 release verification — 2026-09-18

The release runtime is `9e0cc7c379541db0d640ebe03383466c37d933ba` on production deployment `dpl_5gKj1F7r4a5EwqxF97j52PUNCoL5` (`READY`). The exact-head preview reached `READY`, the operator reported unit tests/lint/typecheck/build passing, and the inspected production error/fatal window was empty.

The merged baseline also includes owner-bound library add/remove outbox behavior, export/import collection round-trip handling, richer reading statistics, logical-device clock hardening, search deduplication, and chapter publication timestamps.

Real Account A -> B -> A isolation, two-device synchronization/clock-skew behavior, live signed-in production data, installed-PWA behavior, reader-device checks, representative imports, and a fresh exact-runtime Production Smoke remain post-release validation evidence for the current v1.0.2 line.

## Earlier PR #68 library/read-state refinements — 2026-09-17

The consolidated PWA merge adds two important behavioral refinements without changing account ownership semantics:

- a title with no real progress starts at the earliest available chapter; `Read latest` is not used as the entry action for a brand-new reader;
- `Continue` is shown only when real progress exists for a currently available chapter, preventing stale history alone from manufacturing a continuation target.

Provider freshness is also less expensive:

- concurrent refresh requests for the same title are coalesced;
- very recent automatic refreshes can reuse the stored check instead of immediately repeating provider I/O;
- refresh requests have an overall timeout and preserve the previous baseline on failure;
- WeebCentral parsed chapter lists use a bounded short-lived process cache so large raw HTML responses are not repeatedly parsed or pushed into Next.js Data Cache.

None of these optimizations changes `new_chapter_count`, owner RLS, personal reading status, progress synchronization, acknowledgement semantics, or the rule that provider failures must remain explicit rather than becoming zero-update results.
