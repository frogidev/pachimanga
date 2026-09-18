alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.library_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists library_collections_user_name_idx
  on public.library_collections(user_id, lower(name));

create table if not exists public.library_collection_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.library_collections(id) on delete cascade,
  source_id text not null,
  manga_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, collection_id, source_id, manga_id),
  foreign key (user_id, source_id, manga_id)
    references public.library_entries(user_id, source_id, manga_id)
    on delete cascade
);

create index if not exists library_collection_items_lookup_idx
  on public.library_collection_items(user_id, source_id, manga_id);

alter table public.library_collections enable row level security;
alter table public.library_collection_items enable row level security;

create policy "collections_select_own"
  on public.library_collections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "collections_insert_own"
  on public.library_collections for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "collections_update_own"
  on public.library_collections for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "collections_delete_own"
  on public.library_collections for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "collection_items_select_own"
  on public.library_collection_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "collection_items_insert_own"
  on public.library_collection_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "collection_items_delete_own"
  on public.library_collection_items for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.library_collections, public.library_collection_items from anon;
grant select, insert, update, delete on public.library_collections to authenticated;
grant select, insert, delete on public.library_collection_items to authenticated;

create or replace function public.clear_my_library()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  delete from public.reading_history where user_id = (select auth.uid());
  delete from public.reading_progress where user_id = (select auth.uid());
  delete from public.library_entries where user_id = (select auth.uid());
end;
$$;

revoke all on function public.clear_my_library() from public, anon;
grant execute on function public.clear_my_library() to authenticated;
