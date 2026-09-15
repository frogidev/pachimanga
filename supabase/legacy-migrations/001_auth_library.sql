create extension if not exists pgcrypto;
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.user_library(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_url text,
  favorite boolean not null default true,
  last_chapter_read numeric not null default 0,
  last_page_read integer not null default 0,
  categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,title)
);
create index if not exists user_library_user_idx on public.user_library(user_id,updated_at desc);
alter table public.profiles enable row level security;
alter table public.user_library enable row level security;
grant select,insert,update,delete on public.profiles to authenticated;
grant select,insert,update,delete on public.user_library to authenticated;
drop policy if exists "profile self select" on public.profiles;
create policy "profile self select" on public.profiles for select to authenticated using ((select auth.uid())=id);
drop policy if exists "profile self insert" on public.profiles;
create policy "profile self insert" on public.profiles for insert to authenticated with check ((select auth.uid())=id);
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
drop policy if exists "library self select" on public.user_library;
create policy "library self select" on public.user_library for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "library self insert" on public.user_library;
create policy "library self insert" on public.user_library for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "library self update" on public.user_library;
create policy "library self update" on public.user_library for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "library self delete" on public.user_library;
create policy "library self delete" on public.user_library for delete to authenticated using ((select auth.uid())=user_id);
