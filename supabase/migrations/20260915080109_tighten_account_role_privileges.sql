revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all tables in schema public from authenticated;
revoke all privileges on all sequences in schema public from authenticated;

grant select, insert, update on table public.profiles, public.user_settings to authenticated;
grant select, insert, update, delete on table public.library_entries, public.reading_progress, public.reading_history to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;
