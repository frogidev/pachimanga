import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PdfBuilder, safeFileName } from '../src/lib/offline/pdf.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

async function textOf(blob: Blob) {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}

test('PdfBuilder writes a PDF whose xref offsets point at their objects', async () => {
  const pdf = new PdfBuilder();
  pdf.addJpegPage(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 800, 1200);
  pdf.addJpegPage(new Uint8Array([0xff, 0xd8, 0xaa, 0xbb, 0xff, 0xd9]), 700, 1000);
  assert.equal(pdf.pageCount, 2);
  const text = await textOf(pdf.finish());

  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.match(text, /\/Count 2/);
  assert.match(text, /\/MediaBox \[0 0 800 1200\]/);
  assert.match(text, /\/MediaBox \[0 0 700 1000\]/);

  const xrefAt = Number(/startxref\s+([0-9]+)/.exec(text)?.[1]);
  assert.equal(text.slice(xrefAt, xrefAt + 4), 'xref');
  const entries = [...text.slice(xrefAt).matchAll(/([0-9]{10}) 00000 n/g)].map((match) => Number(match[1]));
  assert.equal(entries.length, 8); // catalog, page tree, 2 x (image, content, page) = 8 objects
  entries.forEach((offset, index) => {
    assert.equal(text.slice(offset, offset + `${index + 1} 0 obj`.length), `${index + 1} 0 obj`);
  });
});

test('PdfBuilder refuses to write an empty document', () => {
  assert.throws(() => new PdfBuilder().finish(), /no-pages/);
});

test('safeFileName removes path separators and reserved characters', () => {
  const backslash = String.fromCharCode(92);
  assert.equal(safeFileName(`a/b${backslash}c:d*e?f"g<h>i|j`), 'a b c d e f g h i j');
  assert.equal(safeFileName('   '), 'pachimanga');
  assert.equal(safeFileName('x'.repeat(300)).length, 120);
});

test('saved chapters, their clear action and exports live in Archive, not Settings', () => {
  assert.match(read('src/app/archive/page.tsx'), /OfflineDownloadManager/);
  assert.doesNotMatch(read('src/app/settings/page.tsx'), /OfflineDownloadManager/);
  const device = read('src/components/pwa-device-status.tsx');
  assert.doesNotMatch(device, /clearChapterCache|clearDownloads/);
  const manager = read('src/components/offline-download-manager.tsx');
  assert.match(manager, /clearAllOfflineChapters/);
  assert.match(manager, /exportMangaZip/);
  assert.match(manager, /exportChapterPdf/);
});

test('clearing saved chapters keeps the account binding (unlike sign-out cleanup)', () => {
  const cache = read('src/lib/offline/chapter-cache.ts');
  const clearAll = cache.slice(cache.indexOf('export async function clearAllOfflineChapters'), cache.indexOf('export async function clearChapterCache'));
  assert.doesNotMatch(clearAll, /CHAPTER_CACHE_OWNER_KEY/);
  assert.match(clearAll, /idbClear\("offlineChapters"\)/);
});

test('page saving prefers readable CORS responses and never sends a referrer', () => {
  const cache = read('src/lib/offline/chapter-cache.ts');
  assert.match(cache, /mode: "cors"/);
  assert.match(cache, /referrerPolicy: "no-referrer"/);
  assert.match(cache, /mode: "no-cors"/);
});

test('the chapter pages route is authenticated, provider-limited and allow-listed', () => {
  const route = read('src/app/api/source/pages/route.ts');
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /PROVIDERS = new Set\(\['weebcentral', 'zonatmo'\]\)/);
  assert.match(route, /withProviderConcurrency/);
  assert.match(route, /private, no-store/);
});

test('saving all chapters skips complete ones and stops cleanly on cancel or low storage', () => {
  const bulk = read('src/lib/offline/bulk-save.ts');
  assert.match(bulk, /row\.savedCount >= row\.total/);
  assert.match(bulk, /stoppedReason: "cancelled"/);
  assert.match(bulk, /stoppedReason: "storage"/);
  assert.match(read('src/features/manga/manga-detail.tsx'), /saveAllChaptersOffline/);
});

test('Internet Explorer gets an explicit unsupported-browser notice', () => {
  const layout = read('src/app/layout.tsx');
  assert.match(layout, /document\.documentMode/);
  assert.match(layout, /Pachimanga needs a modern browser/);
  assert.match(layout, /Pachimanga necesita un navegador moderno/);
});
