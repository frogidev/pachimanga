import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMangaHtml } from '../src/sources/weebcentral/parser.ts';

test('WeebCentral visible Complete metadata wins over unrelated script status text', () => {
  const manga = parseMangaHtml(`
    <html>
      <head>
        <script>window.status = 'loading';</script>
      </head>
      <body>
        <h1>Goodnight Punpun</h1>
        <ul>
          <li><strong>Author(s):</strong> <a href="/search?author=ASANO-Inio">ASANO Inio</a></li>
          <li><strong>Status:</strong> <a href="/search?status=Complete">Complete</a></li>
          <li><strong>Released:</strong> 2007</li>
        </ul>
        <img alt="Goodnight Punpun cover" src="/covers/punpun.jpg" />
      </body>
    </html>
  `, '01J76XYA2AFH8MNBG4FRCM5JMV');

  assert.equal(manga.title, 'Goodnight Punpun');
  assert.equal(manga.status, 'complete');
});
