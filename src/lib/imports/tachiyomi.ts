import protobuf from 'protobufjs';
import type { ImportResult, ImportManga } from './types';

const MAX_COMPRESSED_BYTES = 128 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 256 * 1024 * 1024;

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

function finiteNonNegative(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export async function gunzipWithLimit(bytes: Uint8Array, maxBytes = MAX_DECOMPRESSED_BYTES) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress Tachiyomi backups.');
  }
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel('decompressed backup exceeds safety limit');
        throw new Error(`Tachiyomi backup expands beyond the ${Math.round(maxBytes / 1024 / 1024)} MiB safety limit.`);
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('safety limit')) throw error;
    throw new Error(`Tachiyomi backup could not be decompressed${error instanceof Error ? `: ${error.message}` : '.'}`);
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function mapBackup(decoded: RawBackup): { manga: ImportManga[]; warnings: string[] } {
  const categoryNames = (decoded.backupCategories || []).map((item) => item.name?.trim() || '');
  const manga: ImportManga[] = [];
  const warnings: string[] = [];

  for (const [index, raw] of (decoded.backupManga || []).entries()) {
    const title = raw.title?.trim();
    if (!title) {
      warnings.push(`Skipped Tachiyomi record ${index + 1}: missing title.`);
      continue;
    }

    const chapters = raw.chapters || [];
    const read = chapters.filter((chapter) => chapter.read);
    const partial = chapters.filter((chapter) => finiteNonNegative(chapter.lastPageRead) > 0);
    const lastRead = Math.max(
      0,
      ...read.map((chapter) => finiteNonNegative(chapter.chapterNumber)),
      ...partial.map((chapter) => finiteNonNegative(chapter.chapterNumber)),
    );
    const lastPage = partial
      .slice()
      .sort((a, b) => finiteNonNegative(b.chapterNumber) - finiteNonNegative(a.chapterNumber))[0]?.lastPageRead;
    const total = Math.max(0, ...chapters.map((chapter) => finiteNonNegative(chapter.chapterNumber)));
    const categories = (raw.categories || [])
      .map((categoryIndex) => categoryNames[categoryIndex])
      .filter((name): name is string => Boolean(name));

    manga.push({
      title,
      sourceUrl: raw.url?.trim() || undefined,
      favorite: Boolean(raw.favorite),
      lastChapterRead: lastRead,
      lastPageRead: finiteNonNegative(lastPage),
      totalChapters: total || undefined,
      categories,
    });
  }

  return { manga, warnings };
}

export async function parseTachiyomi(file: File): Promise<ImportResult> {
  if (file.size > MAX_COMPRESSED_BYTES) {
    throw new Error(`Tachiyomi backup is larger than the ${Math.round(MAX_COMPRESSED_BYTES / 1024 / 1024)} MiB compressed safety limit.`);
  }

  const raw = new Uint8Array(await file.arrayBuffer());
  const data = await gunzipWithLimit(raw);
  const root = protobuf.parse(schema).root;
  const Backup = root.lookupType('Backup');

  let decoded: RawBackup;
  try {
    decoded = Backup.toObject(Backup.decode(data), {
      longs: Number,
      defaults: false,
      arrays: true,
    }) as unknown as RawBackup;
  } catch {
    throw new Error('Tachiyomi/Mihon backup protobuf is corrupt or unsupported.');
  }

  const mapped = mapBackup(decoded);
  if (!mapped.manga.length && (decoded.backupManga?.length || 0) > 0) {
    throw new Error('Tachiyomi/Mihon backup contains no valid manga records.');
  }
  return { format: 'tachiyomi', ...mapped };
}
