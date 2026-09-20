import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT=process.cwd();
const read=(path:string)=>readFileSync(join(ROOT,path),'utf8');

test('tracker tokens stay device-local and are excluded from account export',()=>{
  const idb=read('src/lib/storage/idb.ts');
  const exportRoute=read('src/app/api/account/export/route.ts');
  const sync=read('src/lib/offline/sync.ts');
  assert.match(idb,/trackerAuth/);
  assert.match(sync,/trackerAuth/);
  assert.doesNotMatch(exportRoute,/accessToken|refreshToken|trackerAuth/);
  assert.match(exportRoute,/trackerLinks/);
});

test('tracker link storage is owner-RLS protected and source migration preserves links',()=>{
  const trackerSql=read('supabase/migrations/20260919234900_tracker_links.sql');
  const migrationSql=read('supabase/migrations/20260919235000_source_migration_rpc.sql');
  assert.match(trackerSql,/enable row level security/);
  assert.match(trackerSql,/auth\.uid\(\)/);
  assert.match(trackerSql,/revoke all on public\.tracker_links from anon/);
  assert.match(migrationSql,/insert into public\.tracker_links/);
  assert.ok(migrationSql.indexOf('insert into public.tracker_links') < migrationSql.indexOf('delete from public.library_entries'));
});

test('OAuth server routes remain authenticated and private',()=>{
  for(const path of [
    'src/app/api/tracking/anilist/search/route.ts',
    'src/app/api/tracking/myanimelist/search/route.ts',
    'src/app/api/tracking/myanimelist/token/route.ts',
  ]){
    const source=read(path);
    assert.match(source,/auth\.getUser\(\)/,path);
    assert.match(source,/private, no-store/,path);
  }
});

test('source migration fails closed when reading state cannot be mapped',()=>{
  const sql=read('supabase/migrations/20260919235000_source_migration_rpc.sql');
  assert.match(sql,/mapped_progress < total_progress/);
  assert.match(sql,/cannot safely map .* progress rows/);
  assert.match(sql,/cannot safely map reading history/);
});
