import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMangaHtml } from '../src/sources/weebcentral/parser.ts';

test('WeebCentral Completed metadata maps to the normalized complete publication status', () => {
  const manga = parseMangaHtml(`
    <html>
      <body>
        <h1>Goodnight Punpun</h1>
        <div>Status: Completed</div>
        <div>Author(s): Inio Asano</div>
        <img alt="Goodnight Punpun cover" src="/covers/punpun.jpg" />
      </body>
    </html>
  `, '01J76XYDMR2777KEM5BKTBBK83');

  assert.equal(manga.title, 'Goodnight Punpun');
  assert.equal(manga.status, 'complete');
});
