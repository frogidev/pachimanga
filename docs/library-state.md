# Library state, progress, and chapter updates

Pachimanga keeps two different status concepts for a library title. They must not be conflated.

## Publication status

`Manga.status` and `library_entries.publication_status` describe the source series itself:

- `ongoing`
- `complete`
- `hiatus`
- `cancelled`
- `unknown`

This comes from the active provider metadata. For example, a finished series can have `publication_status = complete` regardless of whether the signed-in user has read it.

## Personal reading status

`library_entries.reading_status` describes the signed-in user's state:

- `plan_to_read`
- `reading`
- `completed`
- `on_hold`
- `dropped`

The status is account-owned and synchronized through the existing owner-RLS-protected `library_entries` row.

`reading_status_manual = false` means the status is automatic:

- 0% -> Plan to Read;
- greater than 0% but not fully read -> Reading;
- every known chapter complete -> Completed.

A user can explicitly choose any status from the library card. That sets `reading_status_manual = true`, so progress does not overwrite deliberate choices such as On Hold or Dropped. Choosing Automatic returns control to progress-derived status.

Publication status and personal status are independent. A title may therefore correctly display both `Completed` and `Publication complete`.

## Manga progress

The library percentage is derived from account-owned `reading_progress` rows against the current known chapter count. Partial progress inside a chapter contributes proportionally to the manga percentage; chapters at 99% or above count as complete for completion state.

Reader scroll progress remains dynamic and is saved through the existing owner-bound progress outbox. Mark read/unread writes the same `reading_progress` model, so natural reading and manual read controls converge on the same library percentage.

The normal Library dashboard path no longer downloads every chapter-progress row. Authenticated clients call the `SECURITY INVOKER` function `get_library_progress_summaries()`, which returns one compact row per library title with aggregate percentage/completion counts plus the synchronized history timestamp. The function accepts no user identifier and filters on `auth.uid()`. `anon` has no execute privilege; `authenticated` does.

The older deterministic paged `reading_progress` loader remains as a compatibility/failure fallback. Only a complete aggregate or detailed snapshot may drive automatic `reading_status` writes. If aggregate and paged fallback both fail, Pachimanga preserves the stored/account-bound local status rather than treating missing progress as unread chapters.

If the owner-bound progress outbox has a pending write for a title, the dashboard does not persist a new automatic status from the potentially stale server aggregate until that queue is flushed. Existing local summary state remains visible while the pending write resolves.

For compatibility with libraries imported or summarized before detailed per-chapter progress existed, an existing legacy summary percentage in the account-bound local cache is retained while there are no detailed chapter-progress rows. Once detailed synchronized progress exists, the derived per-chapter calculation wins.

## Synchronization visibility

The shell and Settings surface the actual account-bound progress/settings queue state instead of displaying a hardcoded synced label. The states are:

- `Synced` when the device is online and both owner-bound outboxes are empty;
- `Syncing · N pending` while owner-bound progress/settings changes remain queued;
- `Offline` / `Offline · N pending` when the browser reports no network connectivity.

This indicator is informational only. The existing outboxes, Supabase owner RLS, and newer-only conflict guards remain the synchronization authority.

## Provider chapter-update tracking

The library periodically refreshes live-provider titles through the authenticated `/api/library/refresh` route. The route resolves only the stored source ID through the production source registry; callers cannot supply arbitrary upstream URLs.

A refresh records:

- current provider publication status;
- current chapter count;
- latest chapter ID and number;
- provider publication timestamp when available;
- last provider check time;
- last observed chapter-change time;
- count of newly observed chapters since acknowledgement.

The first provider refresh establishes a baseline and does not label the entire existing catalog as new. Later chapter growth increments `new_chapter_count`. Opening the title acknowledges the badge by resetting that count for the signed-in account.

`Recently Updated` sorts by actual chapter activity when known, falling back to the library-added timestamp for titles that do not yet have an update baseline. The Library also supports last-read, progress, recently-added, and title sorting, an unread-updates filter, a Continue Reading strip driven by synchronized history, and incremental rendering for larger collections.

Provider refusal remains explicit. A 403/429/other source failure does not fabricate chapters, clear the previous snapshot, or fall back to mock data.

## Database migrations

Production migration `20260916165443_add_library_state_tracking.sql` extends `public.library_entries` with personal reading state and provider-update fields/check constraints. It does not replace existing owner RLS policies, unique conflict targets, or least-privilege grants.

Production migrations `20260917024919_add_library_progress_summary_rpc.sql` and `20260917024951_restrict_library_progress_summary_rpc.sql` add the compact account-bound progress summary RPC and explicitly remove `anon`/`PUBLIC` execute access while retaining `authenticated` execute access. The function remains `SECURITY INVOKER` and therefore does not bypass table RLS.

Post-migration verification confirmed the RPC privilege boundary, preserved owner-scoped RLS policies and existing upsert constraints/grants, a clean performance advisor, and only the already-accepted leaked-password-protection security warning.
