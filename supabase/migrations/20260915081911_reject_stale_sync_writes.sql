create or replace function public.pachimanga_keep_newest_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at <= old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.pachimanga_keep_newest_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.read_at <= old.read_at then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.pachimanga_keep_newest_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at <= old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists reading_progress_keep_newest on public.reading_progress;
create trigger reading_progress_keep_newest
before update on public.reading_progress
for each row execute function public.pachimanga_keep_newest_progress();

drop trigger if exists reading_history_keep_newest on public.reading_history;
create trigger reading_history_keep_newest
before update on public.reading_history
for each row execute function public.pachimanga_keep_newest_history();

drop trigger if exists user_settings_keep_newest on public.user_settings;
create trigger user_settings_keep_newest
before update on public.user_settings
for each row execute function public.pachimanga_keep_newest_settings();

revoke all on function public.pachimanga_keep_newest_progress() from public, anon, authenticated;
revoke all on function public.pachimanga_keep_newest_history() from public, anon, authenticated;
revoke all on function public.pachimanga_keep_newest_settings() from public, anon, authenticated;
