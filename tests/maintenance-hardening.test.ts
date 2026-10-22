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
    'src/sources/weebcentral/weebcentral-source.ts',
    'src/sources/zonatmo/zonatmo-source.ts',
  ]) {
    const source = readFileSync(join(ROOT, path), 'utf8');
    assert.match(source, new RegExp(`Pachimanga/${packageJson.version.replaceAll('.', '\\.')}`), path);
    assert.doesNotMatch(source, /Pachimanga\/0\.4/, path);
  }
});

test('extension code runs only in an opaque-origin sandboxed iframe', () => {
  const sandbox = readFileSync(join(ROOT, 'src/lib/extensions/sandbox.ts'), 'utf8');
  const registry = readFileSync(join(ROOT, 'src/lib/extensions/registry.ts'), 'utf8');
  const manager = readFileSync(join(ROOT, 'src/components/extensions/ExtensionManager.tsx'), 'utf8');
  assert.match(sandbox, /setAttribute\('sandbox', 'allow-scripts'\)/);
  assert.doesNotMatch(sandbox, /setAttribute\('sandbox', '[^']*allow-same-origin/);
  assert.doesNotMatch(registry, /new Function|with \(/);
  assert.doesNotMatch(manager, /new Function/);
});

test('installed extensions are cleared when the cached account changes', () => {
  const storage = readFileSync(join(ROOT, 'src/lib/storage/reader-storage.ts'), 'utf8');
  assert.equal(storage.split("removeItem('pachimanga-extensions')").length - 1, 2);
});
