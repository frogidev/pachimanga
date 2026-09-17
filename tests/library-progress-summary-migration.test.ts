import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CREATE_MIGRATION = new URL('../supabase/migrations/20260917024919_add_library_progress_summary_rpc.sql', import.meta.url);
const RESTRICT_MIGRATION = new URL('../supabase/migrations/20260917024951_restrict_library_progress_summary_rpc.sql', import.meta.url);
const RESTRICT_PRODUCTION_MIRROR = new URL('../supabase/migrations/20260917030319_restrict_library_progress_summary_rpc.sql', import.meta.url);

test('library progress summary RPC stays account-bound and security-invoker', async () => {
  const sql = (await readFile(CREATE_MIGRATION, 'utf8')).toLowerCase();
  assert.match(sql, /security invoker/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.doesNotMatch(sql, /security definer/);
  assert.doesNotMatch(sql, /p_user_id|user_id\s+uuid\s*[,)]/);
});

test('library progress summary RPC is not executable by anon in both restriction migrations', async () => {
  for (const migration of [RESTRICT_MIGRATION, RESTRICT_PRODUCTION_MIRROR]) {
    const sql = (await readFile(migration, 'utf8')).toLowerCase();
    assert.match(sql, /revoke execute on function public\.get_library_progress_summaries\(\) from anon/);
    assert.match(sql, /revoke execute on function public\.get_library_progress_summaries\(\) from public/);
    assert.match(sql, /grant execute on function public\.get_library_progress_summaries\(\) to authenticated/);
  }
});
