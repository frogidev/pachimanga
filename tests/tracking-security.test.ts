import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT=process.cwd();
const read=(path:string)=>readFileSync(join(ROOT,path),'utf8');

test('tracker link storage is owner-RLS protected and source migration preserves links',()=>{
  const trackerSql=read('supabase/migrations/20260919234900_tracker_links.sql');
  const migrationSql=read('supabase/migrations/20260919235000_source_migration_rpc.sql');
  assert.match(trackerSql,/enable row level security/);
  assert.match(trackerSql,/auth\.uid\(\)/);
  assert.match(trackerSql,/revoke all on public\.tracker_links from anon/);
  assert.match(migrationSql,/insert into public\.tracker_links/);
  assert.ok(migrationSql.indexOf('insert into public.tracker_links') < migrationSql.indexOf('delete from public.library_entries'));
});

test('source migration fails closed when reading state cannot be mapped',()=>{
  const sql=read('supabase/migrations/20260919235000_source_migration_rpc.sql');
  assert.match(sql,/mapped_progress < total_progress/);
  assert.match(sql,/cannot safely map .* progress rows/);
  assert.match(sql,/cannot safely map reading history/);
});

test('tracker OAuth code and token store are removed',()=>{
  assert.doesNotMatch(read('src/lib/storage/idb.ts'),/createObjectStore\("trackerAuth"/);
  assert.match(read('src/lib/storage/idb.ts'),/deleteObjectStore\("trackerAuth"\)/);
  assert.doesNotMatch(read('.env.example'),/ANILIST|MYANIMELIST/);
});
