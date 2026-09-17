import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const HEAVY_PACKAGES = ['tesseract.js', 'sql.js', 'protobufjs', 'fflate'];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test('heavy import engines stay inside the import subsystem', () => {
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const source = readFileSync(file, 'utf8');
    if (!HEAVY_PACKAGES.some((pkg) => source.includes(pkg))) continue;
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    if (!rel.startsWith('src/lib/imports/')) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

test('backup engines and OCR are loaded only when their import path is invoked', () => {
  const dispatcher = readFileSync(join(SRC, 'lib/imports/index.ts'), 'utf8');
  const ocr = readFileSync(join(SRC, 'lib/imports/ocr.ts'), 'utf8');

  assert.match(dispatcher, /await import\(['"]\.\/tachiyomi['"]\)/);
  assert.match(dispatcher, /await import\(['"]\.\/tachimanga['"]\)/);
  assert.match(dispatcher, /await import\(['"]\.\/json['"]\)/);
  assert.match(ocr, /await import\(['"]tesseract\.js['"]\)/);

  assert.doesNotMatch(dispatcher, /^import .* from ['"]\.\/(?:tachiyomi|tachimanga|json)['"]/m);
  assert.doesNotMatch(ocr, /^import .* from ['"]tesseract\.js['"]/m);
});

test('service worker runtime cache keeps an explicit finite entry bound', () => {
  const sw = readFileSync(join(ROOT, 'public/sw.js'), 'utf8');
  const match = sw.match(/RUNTIME_CACHE_LIMIT\s*=\s*(\d+)/);
  assert.ok(match, 'service worker is missing RUNTIME_CACHE_LIMIT');
  const limit = Number(match[1]);
  assert.ok(Number.isInteger(limit) && limit > 0 && limit <= 500, `runtime cache limit is unexpectedly large: ${limit}`);
  assert.match(sw, /trimRuntimeCache\(cache\)/);
});
