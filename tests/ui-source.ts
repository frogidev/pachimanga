import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../src/lib/i18n/en.ts';

/**
 * Reads a UI source file with every `t("key")` call replaced by its English text, so
 * structural/copy assertions keep working now that components render translated strings.
 */
export function readUi(path: string) {
  const text = readFileSync(join(process.cwd(), path), 'utf8');
  const call = /\bt\(\s*(["'`])([a-z][\w.]*)\1(?:\s*,\s*\{[^}]*\})?\s*\)/g;
  return text
    .replace(new RegExp(`=\{${call.source}\}`, 'g'), (match, _quote, key: string) => (key in en ? `="${en[key]}"` : match))
    .replace(call, (match, _quote, key: string) => (key in en ? JSON.stringify(en[key]) : match));
}
