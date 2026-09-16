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

On a clean login, the Library rehydrates the full remote progress snapshot in deterministic bounded pages instead of assuming one Data API response contains every row. The query is ordered before ranged pagination. Only a complete remote snapshot may drive automatic `reading_status` writes; if any page fails, Pachimanga keeps the stored status/account-bound local fallback rather than treating missing pages as unread chapters.

For compatibility with libraries imported or summarized before detailed per-chapter progress existed, an existing legacy summary percentage in the account-bound local cache is retained while there are no detailed chapter-progress rows. Once detailed synchronized progress exists, the derived per-chapter calculation wins.

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

`Recently Updated` sorts by actual chapter activity when known, falling back to the library-added timestamp for titles that do not yet have an update baseline.

Provider refusal remains explicit. A 403/429/other source failure does not fabricate chapters, clear the previous snapshot, or fall back to mock data.

## Database migration

Production migration `20260916165443_add_library_state_tracking.sql` extends `public.library_entries` with these fields and check constraints. It does not replace existing owner RLS policies, unique conflict targets, or least-privilege grants.

The migration was applied to production project `gwpgaojsemcfikgynxwv` on 2026-09-16 before the runtime merge. Post-migration verification confirmed the new columns and checks, preserved owner-scoped RLS policies, preserved the library upsert unique constraint, no `anon` table grants, unchanged authenticated CRUD grants, a clean performance advisor, and only the already-accepted leaked-password-protection security warning.
