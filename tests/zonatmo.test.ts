import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parseChaptersHtml, parseMangaHtml, parseReaderHtml, parseSearchHtml } from '../src/sources/zonatmo/parser.ts';

const SEARCH = `
<div class="element col-6" data-identifier="4215">
  <a href="https://zonatmo.org/library/manga/4215/blue-lock">
    <div class="thumbnail book lazy-cover" data-bg="https://zonatmo.org/storage/covers/4215.webp?v=2">
      <div class="thumbnail-title"><h4 class="text-truncate" title="Blue &amp; Lock">Blue Lock</h4></div>
      <span class="book-meta-status meta-success">En emisión</span>
    </div>
  </a>
</div>
<div class="element col-6" data-identifier="4215"><a href="https://zonatmo.org/library/manga/4215/blue-lock"><h4 title="Dup">Dup</h4></a></div>
<div class="element col-6" data-identifier="77"><a href="https://zonatmo.org/library/novela/77/una-novela"><h4 title="Novela">Novela</h4></a></div>`;

const SERIES = `
<link rel="canonical" href="https://zonatmo.org/library/manhwa/4215/blue-lock">
<meta property="og:image" content="https://zonatmo.org/storage/covers/4215.webp?v=2">
<h1 class="book-type bg-manga mt-4">MANGA</h1>
<h1 class="element-title my-2">Blue Lock</h1>
<p class="element-description collapsed" id="manga-synopsis">Tras una derrota &amp; más.</p>
<span class="book-status finished"><span class="status-dot"></span>Finalizado</span><h5>x</h5>
<a href="https://zonatmo.org/biblioteca?filter_by=author&amp;title=Autor+Uno">Autor Uno</a>
<ul id="chapters-list">
<li class="list-group-item p-0 bg-light upload-link" data-chapter-number="2">
  <span class="chapter-number font-weight-bold ml-1" data-number="2">Capítulo 2</span>
  <a href="https://zonatmo.org/view_uploads/200">Leer online</a>
  <a href="https://zonatmo.org/view_uploads/201">Otro grupo</a>
  <i class="far fa-calendar fa-fw"></i> 21/10/2026
</li>
<li class="list-group-item p-0 bg-light upload-link" data-chapter-number="10.5">
  <span class="chapter-number font-weight-bold ml-1" data-number="10.5">Capítulo 10.5</span>
  <a href="https://zonatmo.org/view_uploads/300">Leer online</a>
</li>
<li class="list-group-item p-0 bg-light upload-link" data-chapter-number="2">
  <span class="chapter-number">Capítulo 2 (dup)</span><a href="https://zonatmo.org/view_uploads/999">x</a>
</li></ul>`;

const READER = `
<div id="reader-header"><a href="https://zonatmo.org/library/manga/4215/blue-lock" title="Volver"><span class="d-none d-sm-inline">Blue Lock</span></a>
<select id="chapterSelect">
 <option value="https://zonatmo.org/view_uploads/200">Cap. 2 — Capítulo2</option>
 <option value="https://zonatmo.org/view_uploads/201" selected>Cap. 2 — Título especial</option>
 <option value="https://zonatmo.org/view_uploads/300">Cap. 10.5</option>
</select></div>
<link rel="preload" as="image" href="https://storage.zonatmo.org/chapters/201/1.webp">
<img src="https://storage.zonatmo.org/chapters/201/1.webp" alt="Página 1" class="reader-image" loading="eager">
<img src="https://storage.zonatmo.org/chapters/201/2.webp" alt="Página 2" class="reader-image" loading="lazy">
<img src="https://storage.zonatmo.org/chapters/201/2.webp" alt="Página 2" class="reader-image">
<img src="/img/logo.png" alt="logo">`;

test('search cards become Spanish manga, dropping duplicates and novels', () => {
  const [manga, ...rest] = parseSearchHtml(SEARCH);
  assert.equal(rest.length, 0);
  assert.equal(manga.id, 'zt-4215');
  assert.equal(manga.title, 'Blue & Lock');
  assert.equal(manga.status, 'ongoing');
  assert.equal(manga.language, 'es');
  assert.equal(manga.coverUrl, 'https://zonatmo.org/storage/covers/4215.webp?v=2');
  assert.equal(manga.sourceUrl, 'https://zonatmo.org/library/manga/4215/blue-lock');
});

test('series page parses title (not the type badge), status, people and canonical URL', () => {
  const manga = parseMangaHtml(SERIES, '4215');
  assert.equal(manga.title, 'Blue Lock');
  assert.equal(manga.status, 'complete');
  assert.equal(manga.author, 'Autor Uno');
  assert.equal(manga.description, 'Tras una derrota & más.');
  assert.equal(manga.sourceUrl, 'https://zonatmo.org/library/manhwa/4215/blue-lock');
});

test('chapter list keeps the first upload per chapter number, newest first, with dates', () => {
  const chapters = parseChaptersHtml(SERIES, '4215');
  assert.deepEqual(chapters.map((chapter) => [chapter.id, chapter.chapterNumber]), [['ztc-300', 10.5], ['ztc-200', 2]]);
  assert.equal(chapters[1].publishedAt, '2026-10-21T00:00:00.000Z');
  assert.equal(chapters[1].mangaId, 'zt-4215');
});

test('reader page yields manga link, selector chapters and ordered unique page images', () => {
  const reader = parseReaderHtml(READER, '201');
  assert.equal(reader.manga.id, 'zt-4215');
  assert.equal(reader.manga.title, 'Blue Lock');
  assert.deepEqual(reader.pages.map((page) => page.imageUrl), [
    'https://storage.zonatmo.org/chapters/201/1.webp',
    'https://storage.zonatmo.org/chapters/201/2.webp',
  ]);
  // The open upload wins over the other upload of the same chapter number.
  assert.deepEqual(reader.chapters.map((chapter) => chapter.id), ['ztc-300', 'ztc-201']);
  assert.equal(reader.chapterTitle, 'Título especial');
  assert.throws(() => parseReaderHtml('<div id="reader-header"></div>', '1'), /series could not be resolved/);
});

test('ZonaTMO source only fetches its fixed origin, validates ids and never bypasses challenges', () => {
  const source = readFileSync(join(process.cwd(), 'src/sources/zonatmo/zonatmo-source.ts'), 'utf8');
  assert.match(source, /ZONATMO_BASE\}\$\{path\}/);
  assert.ok(source.includes('const ID = /^\\d{1,9}$/;'));
  assert.match(source, /cf-mitigated/);
  assert.match(source, /Pachimanga\/1\.0\.2/);
  assert.doesNotMatch(source, /cookie|Cookie|x-forwarded/);
});

test('chapter images are never requested with the app as referrer (host hotlink-protects them)', () => {
  const reader = readFileSync(join(process.cwd(), 'src/features/reader/reader-view.tsx'), 'utf8');
  const cache = readFileSync(join(process.cwd(), 'src/lib/offline/chapter-cache.ts'), 'utf8');
  assert.match(reader, /referrerPolicy="no-referrer"/);
  assert.match(cache, /referrerPolicy: "no-referrer"/);
});
