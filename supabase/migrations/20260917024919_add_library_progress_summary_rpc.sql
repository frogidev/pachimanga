create or replace function public.get_library_progress_summaries()
returns table (
  source_id text,
  manga_id text,
  progress_percentage double precision,
  progress_row_count bigint,
  completed_chapter_count bigint,
  last_read_at timestamptz,
  last_chapter_id text,
  last_chapter_percentage double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    le.source_id,
    le.manga_id,
    case
      when le.chapter_count > 0 then least(
        100::double precision,
        coalesce(sum(least(1::double precision, greatest(0::double precision, rp.scroll_progress))), 0::double precision)
          * 100::double precision / le.chapter_count::double precision
      )
      else 0::double precision
    end as progress_percentage,
    count(rp.chapter_id)::bigint as progress_row_count,
    count(rp.chapter_id) filter (where rp.completed or rp.scroll_progress >= 0.99)::bigint as completed_chapter_count,
    rh.read_at as last_read_at,
    rh.chapter_id as last_chapter_id,
    rh.percentage as last_chapter_percentage
  from public.library_entries le
  left join public.reading_progress rp
    on rp.user_id = le.user_id
   and rp.source_id = le.source_id
   and rp.manga_id = le.manga_id
  left join public.reading_history rh
    on rh.user_id = le.user_id
   and rh.source_id = le.source_id
   and rh.manga_id = le.manga_id
  where le.user_id = (select auth.uid())
  group by
    le.source_id,
    le.manga_id,
    le.chapter_count,
    rh.read_at,
    rh.chapter_id,
    rh.percentage
$$;

revoke all on function public.get_library_progress_summaries() from public;
grant execute on function public.get_library_progress_summaries() to authenticated;
