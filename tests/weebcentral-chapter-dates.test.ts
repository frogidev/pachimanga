import assert from 'node:assert/strict';
import test from 'node:test';
import { parseChaptersHtml } from '../src/sources/weebcentral/parser.ts';

test('WeebCentral chapter parser preserves published datetime metadata', () => {
  const mangaId = '01J76XYDMR2777KEM5BKTBBK83';
  const chapterId = '01J76XYDMR2777KEM5BKTBBK84';
  const chapters = parseChaptersHtml(
    `<a href="/chapters/${chapterId}"><span><span>Chapter 12</span></span><time datetime="2026-09-17T14:30:00Z">today</time></a>`,
    mangaId,
  );

  assert.equal(chapters.length, 1);
  assert.equal(chapters[0]?.chapterNumber, 12);
  assert.equal(chapters[0]?.publishedAt, '2026-09-17T14:30:00.000Z');
});

test('WeebCentral chapter parser leaves unknown dates empty rather than fabricating them', () => {
  const chapters = parseChaptersHtml(
    '<a href="/chapters/01J76XYDMR2777KEM5BKTBBK84"><span>Chapter 1</span></a>',
    '01J76XYDMR2777KEM5BKTBBK83',
  );
  assert.equal(chapters[0]?.publishedAt, undefined);
});
