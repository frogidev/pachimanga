import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const migration = readFileSync(
  join(ROOT, 'supabase/migrations/20260918010000_pwa_collections_profile_and_clear_rpc.sql'),
  'utf8',
);
const collections = readFileSync(join(ROOT, 'src/lib/storage/library-collections.ts'), 'utf8');
const account = readFileSync(join(ROOT, 'src/components/account-settings.tsx'), 'utf8');
const storage = readFileSync(join(ROOT, 'src/lib/storage/reader-storage.ts'), 'utf8');

test('collections remain owner-scoped with RLS and library-entry cascade ownership', () => {
  assert.match(migration, /alter table public\.library_collections enable row level security/);
  assert.match(migration, /alter table public\.library_collection_items enable row level security/);
  assert.match(migration, /auth\.uid\(\).*user_id/s);
  assert.match(migration, /references public\.library_entries\(user_id, source_id, manga_id\).*on delete cascade/s);
  assert.match(collections, /\.eq\('user_id', user\.id\)/);
  assert.match(collections, /onConflict: 'user_id,collection_id,source_id,manga_id'/);
});

test('profile personalization uses the private profiles row as canonical storage', () => {
  assert.match(migration, /add column if not exists avatar_url text/);
  assert.match(account, /\.from\('profiles'\)/);
  assert.match(account, /display_name: displayName/);
  assert.match(account, /avatar_url: avatarUrl \|\| null/);
  assert.match(account, /auth\.updateUser/);
});

test('clear library prefers a transactional authenticated RPC with compatibility fallback', () => {
  assert.match(migration, /function public\.clear_my_library\(\)/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /delete from public\.reading_history/);
  assert.match(migration, /delete from public\.reading_progress/);
  assert.match(migration, /delete from public\.library_entries/);
  assert.match(storage, /\.rpc\('clear_my_library'\)/);
  assert.match(storage, /PGRST202/);
});
