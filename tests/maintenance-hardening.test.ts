import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const nextConfig = readFileSync(join(ROOT, 'next.config.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };

test('security headers protect form targets and HTTPS transport', () => {
  assert.match(nextConfig, /form-action 'self'/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /max-age=31536000; includeSubDomains/);
});

test('provider user agents match the released package version', () => {
  for (const path of [
    'src/sources/mangadex/mangadex-source.ts',
    'src/sources/comick/comick-source.ts',
    'src/sources/weebcentral/weebcentral-source.ts',
  ]) {
    const source = readFileSync(join(ROOT, path), 'utf8');
    assert.match(source, new RegExp(`Pachimanga/${packageJson.version.replaceAll('.', '\\.')}`), path);
    assert.doesNotMatch(source, /Pachimanga\/0\.4/, path);
  }
});
