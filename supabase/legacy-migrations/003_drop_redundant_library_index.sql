-- `library_entries_user_id_source_id_manga_id_key` is the constraint-backed
-- unique index used by application upserts. Keep it.
--
-- This standalone index covers the exact same columns and is redundant.
drop index if exists public.library_entries_user_source_manga_idx;
