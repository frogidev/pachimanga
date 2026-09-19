create table if not exists public.tracker_links(
 user_id uuid not null references auth.users(id) on delete cascade,
 source_id text not null,
 manga_id text not null,
 provider text not null check(provider in ('anilist','myanimelist')),
 media_id text not null check(char_length(media_id) between 1 and 64),
 media_title text not null check(char_length(media_title) between 1 and 500),
 updated_at timestamptz not null default now(),
 primary key(user_id,source_id,manga_id,provider),
 foreign key(user_id,source_id,manga_id) references public.library_entries(user_id,source_id,manga_id) on delete cascade
);
alter table public.tracker_links enable row level security;
create policy "tracker_links_select_own" on public.tracker_links for select to authenticated using((select auth.uid())=user_id);
create policy "tracker_links_insert_own" on public.tracker_links for insert to authenticated with check((select auth.uid())=user_id);
create policy "tracker_links_update_own" on public.tracker_links for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "tracker_links_delete_own" on public.tracker_links for delete to authenticated using((select auth.uid())=user_id);
revoke all on public.tracker_links from anon;
grant select,insert,update,delete on public.tracker_links to authenticated;
