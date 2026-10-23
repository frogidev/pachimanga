import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { en } from '../src/lib/i18n/en.ts';
import { es } from '../src/lib/i18n/es.ts';

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !path.includes(`${join('lib', 'i18n')}`) ? [path] : [];
  });
}

const used = new Set<string>();
for (const file of sourceFiles(SRC)) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\bt\(\s*["'`]([a-z][a-zA-Z0-9_.]*)["'`]/g)) used.add(match[1]);
  for (const match of text.matchAll(/\b(?:key|labelKey|title|eyebrow|description|subtitle)[=:]\s*["']([a-z]+\.[a-zA-Z0-9_.]+)["']/g)) used.add(match[1]);
}

test('Spanish and English dictionaries define exactly the same keys', () => {
  const missingInEs = Object.keys(en).filter((key) => !(key in es));
  const missingInEn = Object.keys(es).filter((key) => !(key in en));
  assert.deepEqual(missingInEs, [], 'keys missing in es');
  assert.deepEqual(missingInEn, [], 'keys missing in en');
});

test('every translated string keeps the same {placeholders} in both languages', () => {
  for (const key of Object.keys(en)) {
    const vars = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    assert.equal(vars(es[key] ?? ''), vars(en[key]), key);
  }
});

test('every t("key") used in the app exists in both dictionaries', () => {
  const missing = [...used].filter((key) => !(key in en) || !(key in es));
  assert.deepEqual(missing.sort(), []);
});

test('no Spanish translation is empty', () => {
  for (const [key, value] of Object.entries(es)) assert.ok(value.trim().length > 0, key);
});

test('every component using useLocale is a client component rendered inside the LocaleProvider', () => {
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    if (!/\buseLocale\(\)/.test(text)) continue;
    assert.match(text.slice(0, 80), /["']use client["']/, `${file} needs "use client"`);
  }
  const layout = readFileSync(join(SRC, 'app/layout.tsx'), 'utf8');
  const provider = layout.indexOf('<LocaleProvider>');
  assert.ok(provider > -1 && layout.indexOf('<PwaRegister />') > provider, 'PwaRegister must render inside LocaleProvider');
});
