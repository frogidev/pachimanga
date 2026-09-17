revoke execute on function public.get_library_progress_summaries() from anon;
revoke execute on function public.get_library_progress_summaries() from public;
grant execute on function public.get_library_progress_summaries() to authenticated;
