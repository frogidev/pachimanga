import { unzipSync } from 'fflate';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { detectTmbKind } from './tmb-format';
import type { ImportResult, ImportManga } from './types';

function findDb(entries: Record<string, Uint8Array>) {
  const key =
    Object.keys(entries).find((k) => /\.(sqlite|sqlite3|db)$/i.test(k)) ||
    Object.keys(entries).find((k) => /database/i.test(k));
  return key ? entries[key] : null;
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
    let zip: Record<string, Uint8Array>;
    try {
      zip = unzipSync(raw);
    } catch {
      throw new Error('This .tmb archive could not be opened. Export a fresh backup from Tachimanga and try again.');
    }
    const found = findDb(zip);
    if (!found) throw new Error('No SQLite database was found inside this Tachimanga backup.');
    bytes = found;
  }
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
  const db = new SQL.Database(bytes);
  const names = tableNames(db);
  const mangaTable = firstExisting(names, ['Manga', 'manga', 'mangas', 'library']);
  if (!mangaTable)
    throw new Error(
      `Tachimanga database loaded, but no recognized manga table was found. Tables: ${names.join(', ')}`
    );
  const result = db.exec(`select * from "${mangaTable.replaceAll('"', '')}"`)[0];
  if (!result) return { format: 'tachimanga', manga: [], warnings: ['Manga table is empty.'] };
  const cols = result.columns.map((c: string) => c.toLowerCase());
  const idx = (...c: string[]) =>
    c.map((x) => cols.indexOf(x.toLowerCase())).find((i) => i >= 0) ?? -1;
  const titleI = idx('title', 'name');
  const urlI = idx('url', 'mangaurl', 'sourceurl');
  const favoriteI = idx('favorite', 'isfavorite', 'inlibrary');
  const lastChapterI = idx('lastchapterread', 'last_read_chapter', 'lastchapter');
  const manga: ImportManga[] = result.values.map((row: SqlValue[]) => ({
    title: titleI >= 0 ? String(row[titleI] || 'Untitled') : 'Untitled',
    sourceUrl: urlI >= 0 ? String(row[urlI] || '') : undefined,
    favorite: favoriteI >= 0 ? Boolean(row[favoriteI]) : true,
    lastChapterRead: lastChapterI >= 0 ? Number(row[lastChapterI] || 0) : 0,
  }));
  return {
    format: 'tachimanga',
    manga,
    warnings: [
      'Tachimanga schema varies by release; unmatched progress fields are left empty rather than guessed.',
    ],
  };
}
