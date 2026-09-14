import protobuf from 'protobufjs';
import type { ImportResult } from './types';

const schema = `syntax = "proto2";
message Backup { repeated BackupManga backupManga = 1; repeated BackupCategory backupCategories = 2; }
message BackupCategory { optional string name = 1; optional int32 order = 2; }
message BackupManga { optional string url = 2; optional string title = 3; repeated BackupChapter chapters = 16; repeated int32 categories = 17; optional bool favorite = 100; repeated BackupHistory history = 104; }
message BackupChapter { optional string url = 1; optional string name = 2; optional bool read = 4; optional int64 lastPageRead = 6; optional float chapterNumber = 9; }
message BackupHistory { optional string url = 1; optional int64 lastRead = 2; }`;

interface RawBackupChapter {
  url?: string;
  name?: string;
  read?: boolean;
  lastPageRead?: number;
  chapterNumber?: number;
}

interface RawBackupManga {
  url?: string;
  title?: string;
  favorite?: boolean;
  chapters?: RawBackupChapter[];
  categories?: number[];
}

interface RawBackupCategory {
  name?: string;
  order?: number;
}

interface RawBackup {
  backupCategories?: RawBackupCategory[];
  backupManga?: RawBackupManga[];
}

async function ungzip(bytes: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress Tachiyomi backups.');
  }
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function parseTachiyomi(file: File): Promise<ImportResult> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const data = await ungzip(raw);
  const root = protobuf.parse(schema).root;
  const Backup = root.lookupType('Backup');
  const decoded = Backup.toObject(Backup.decode(data), {
    longs: Number,
    defaults: false,
    arrays: true,
  }) as unknown as RawBackup;

  const categories = (decoded.backupCategories || []).map((x) => x.name || '').filter(Boolean);
  const manga = (decoded.backupManga || []).map((m) => {
    const chapters = m.chapters || [];
    const read = chapters.filter((c) => c.read);
    const partial = chapters.filter((c) => Number(c.lastPageRead || 0) > 0);
    const lastRead = Math.max(
      0,
      ...read.map((c) => Number(c.chapterNumber || 0)),
      ...partial.map((c) => Number(c.chapterNumber || 0))
    );
    const lastPage =
      partial.slice().sort((a, b) => Number(b.chapterNumber || 0) - Number(a.chapterNumber || 0))[0]?.lastPageRead || 0;
    const total = Math.max(0, ...chapters.map((c) => Number(c.chapterNumber || 0)));
    return {
      title: String(m.title || 'Untitled'),
      sourceUrl: m.url ? String(m.url) : undefined,
      favorite: Boolean(m.favorite),
      lastChapterRead: lastRead,
      lastPageRead: Number(lastPage),
      totalChapters: total || undefined,
      categories: (m.categories || []).map((i: number) => categories[i]).filter(Boolean),
    };
  });
  return { format: 'tachiyomi', manga, warnings: [] };
}
