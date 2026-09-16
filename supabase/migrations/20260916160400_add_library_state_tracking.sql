alter table public.library_entries
  add column reading_status text not null default 'plan_to_read',
  add column reading_status_manual boolean not null default false,
  add column publication_status text not null default 'unknown',
  add column chapter_count integer not null default 0,
  add column latest_chapter_id text,
  add column latest_chapter_number double precision,
  add column latest_chapter_published_at timestamptz,
  add column new_chapter_count integer not null default 0,
  add column last_chapter_change_at timestamptz,
  add column last_checked_at timestamptz;

alter table public.library_entries
  add constraint library_entries_reading_status_check
    check (reading_status in ('reading', 'completed', 'on_hold', 'dropped', 'plan_to_read')),
  add constraint library_entries_publication_status_check
    check (publication_status in ('ongoing', 'complete', 'hiatus', 'cancelled', 'unknown')),
  add constraint library_entries_chapter_count_check
    check (chapter_count >= 0),
  add constraint library_entries_new_chapter_count_check
    check (new_chapter_count >= 0);
