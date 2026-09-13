-- Future cloud-sync schema. The MVP does not require this database.
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  provider_user_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  name text not null,
  base_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists manga (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references sources(id),
  source_manga_id text not null,
  title text not null,
  alternative_titles jsonb not null default '[]'::jsonb,
  description text not null default '',
  cover_url text,
  author text,
  artist text,
  status text not null default 'unknown',
  genres jsonb not null default '[]'::jsonb,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_manga_id)
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  manga_id uuid not null references manga(id) on delete cascade,
  source_id text not null references sources(id),
  source_chapter_id text not null,
  title text not null,
  chapter_number numeric,
  volume_number numeric,
  published_at timestamptz,
  source_url text,
  created_at timestamptz not null default now(),
  unique (source_id, source_chapter_id)
);

create table if not exists library_entries (
  user_id uuid not null references users(id) on delete cascade,
  manga_id uuid not null references manga(id) on delete cascade,
  added_at timestamptz not null default now(),
  last_read_at timestamptz,
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  primary key (user_id, manga_id)
);

create table if not exists reading_progress (
  user_id uuid not null references users(id) on delete cascade,
  manga_id uuid not null references manga(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  page_index integer not null default 0 check (page_index >= 0),
  scroll_position double precision not null default 0 check (scroll_position >= 0),
  percentage numeric not null default 0 check (percentage >= 0 and percentage <= 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table if not exists reading_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  manga_id uuid not null references manga(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  percentage numeric not null default 0 check (percentage >= 0 and percentage <= 100),
  read_at timestamptz not null default now()
);

create index if not exists reading_history_user_read_at_idx
  on reading_history (user_id, read_at desc);

create table if not exists settings (
  user_id uuid primary key references users(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
