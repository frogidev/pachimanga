import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { unzipEntries } from './minizip';
import { columnSet } from './sqlite-schema';
import { detectTmbKind } from './tmb-format';
import type { ImportResult, ImportManga } from './types';

function findDb(entries: Record<string, Uint8Array>) {
  const key =
    Object.keys(entries).find((k) => /\.(sqlite|sqlite3|db)$/i.test(k)) ||
    Object.keys(entries).find((k) => /database/i.test(k));
  return key ? entries[key] : null;
}

function remoteCoverUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function unzipBestEffort(raw: Uint8Array, label: string): Record<string, Uint8Array> {
  try {
    return unzipEntries(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`This .tmb archive (${label}, ${(raw.length / 1024).toFixed(0)} KB) could not be opened [${reason}]. Export a fresh backup from Tachimanga and try again.`);
  }
}

function tableNames(db: Database): string[] {
  const res = db.exec("select name from sqlite_master where type='table'");
  return res[0]?.values?.flat().map(String) || [];
}

function firstExisting(names: string[], candidates: string[]) {
  return candidates.find((c) => names.includes(c));
}

export async function parseTachimanga(file: File): Promise<ImportResult> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const kind = detectTmbKind(raw);
  if (kind === 'unknown') {
    throw new Error(
      'This .tmb file is not a supported Tachimanga backup variant (expected a zip or a raw SQLite database). Export a fresh backup from Tachimanga and try again.'
    );
  }
  let bytes: Uint8Array;
  if (kind === 'sqlite') {
    bytes = raw;
  } else {
    const outer = unzipBestEffort(raw, 'outer');
    const nested = outer['contents.zip'];
    const entries = nested ? unzipBestEffort(nested, 'contents.zip') : outer;
    const found = findDb(entries);
    if (!found) throw new Error('No SQLite database was found inside this Tachimanga backup.');
    bytes = found;
  }
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
  const db = new SQL.Database(bytes);
  const names = tableNames(db);
  const manga = readTachideskLibrary(db, names) ?? readGenericTable(db, names);
  return {
    format: 'tachimanga',
    manga,
    warnings: [
      'Tachimanga schema varies by release; unmatched progress fields are left empty rather than guessed.',
    ],
  };
}

function readTachideskLibrary(db: Database, names: string[]): ImportManga[] | null {
  try {
    if (!names.includes('Manga') || !names.includes('Chapter')) return null;
    const mangaCols = columnSet(db, 'Manga');
    const chapterCols = columnSet(db, 'Chapter');
    for (const col of ['id', 'title', 'in_library']) if (!mangaCols.has(col)) return null;
    for (const col of ['manga', 'chapter_number', 'read', 'last_page_read']) if (!chapterCols.has(col)) return null;
    const hasCover = mangaCols.has('thumbnail_url');
    const rows = db.exec(
      `select m.id, m.title, m.real_url, m.url, m.in_library,
        (select max(c.chapter_number) from Chapter c where c.manga = m.id and (c.read or c.last_page_read > 0)),
        (select c2.last_page_read from Chapter c2 where c2.manga = m.id and (c2.read or c2.last_page_read > 0) order by c2.chapter_number desc limit 1)${hasCover ? ', m.thumbnail_url' : ''},
        (select max(c3.chapter_number) from Chapter c3 where c3.manga = m.id)
      from Manga m`
    )[0]?.values as SqlValue[][] | undefined;
    if (!rows) return [];
    const categories = new Map<number, string[]>();
    if (names.includes('Category') && names.includes('CategoryManga')) {
      const catCols = columnSet(db, 'CategoryManga');
      if (catCols.has('category') && catCols.has('manga')) {
        const pairs = db.exec(
          `select cm.manga, c.name from CategoryManga cm join Category c on c.id = cm.category`
        )[0]?.values as SqlValue[][] | undefined;
        for (const [mangaId, name] of pairs || []) {
          const key = Number(mangaId);
          if (!categories.has(key)) categories.set(key, []);
          if (name) categories.get(key)?.push(String(name));
        }
      }
    }
    const totalIdx = hasCover ? 8 : 7;
    return rows.map((row) => ({
      title: String(row[1] || 'Untitled'),
      sourceUrl: String(row[2] || row[3] || '') || undefined,
      coverUrl: hasCover ? remoteCoverUrl(row[7]) : undefined,
      favorite: Number(row[4] || 0) !== 0,
      lastChapterRead: Number(row[5] || 0),
      lastPageRead: Number(row[6] || 0),
      totalChapters: Number(row[totalIdx] || 0) || undefined,
      categories: categories.get(Number(row[0])) || [],
    }));
  } catch {
    return null;
  }
}

function readGenericTable(db: Database, names: string[]): ImportManga[] {
  const mangaTable = firstExisting(names, ['Manga', 'manga', 'mangas', 'library']);
  if (!mangaTable)
    throw new Error(
      `Tachimanga database loaded, but no recognized manga table was found. Tables: ${names.join(', ')}`
    );
  const result = db.exec(`select * from "${mangaTable.replaceAll('"', '')}"`)[0];
  if (!result) return [];
  const cols = result.columns.map((c: string) => c.toLowerCase());
  const idx = (...c: string[]) =>
    c.map((x) => cols.indexOf(x.toLowerCase())).find((i) => i >= 0) ?? -1;
  const titleI = idx('title', 'name');
  const urlI = idx('url', 'mangaurl', 'sourceurl');
  const favoriteI = idx('favorite', 'isfavorite', 'inlibrary');
  const lastChapterI = idx('lastchapterread', 'last_read_chapter', 'lastchapter');
  const coverI = idx('thumbnail_url', 'thumbnailurl', 'cover', 'coverurl');
  return result.values.map((row: SqlValue[]) => ({
    title: titleI >= 0 ? String(row[titleI] || 'Untitled') : 'Untitled',
    sourceUrl: urlI >= 0 ? String(row[urlI] || '') : undefined,
    coverUrl: coverI >= 0 ? remoteCoverUrl(row[coverI]) : undefined,
    favorite: favoriteI >= 0 ? Boolean(row[favoriteI]) : true,
    lastChapterRead: lastChapterI >= 0 ? Number(row[lastChapterI] || 0) : 0,
  }));
}
