import type { ImportResult } from './types';
import { parseTachiyomi } from './tachiyomi';
import { parseTachimanga } from './tachimanga';

export async function parseBackup(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.tachibk') || name.endsWith('.proto.gz')) return parseTachiyomi(file);
  if (name.endsWith('.tmb')) return parseTachimanga(file);
  if (name.endsWith('.json')) {
    const json = JSON.parse(await file.text()) as unknown;
    const list: Record<string, unknown>[] = Array.isArray(json)
      ? (json as Record<string, unknown>[])
      : json && typeof json === 'object'
        ? ((json as { manga?: Record<string, unknown>[]; library?: Record<string, unknown>[] }).manga ||
            (json as { manga?: Record<string, unknown>[]; library?: Record<string, unknown>[] }).library ||
            [])
        : [];
    return {
      format: 'json',
      manga: list.map((x) => ({
        title: String(x.title || x.name || 'Untitled'),
        sourceUrl: typeof x.url === 'string' ? x.url : typeof x.sourceUrl === 'string' ? x.sourceUrl : undefined,
        coverUrl: typeof x.coverUrl === 'string' ? x.coverUrl : typeof x.cover === 'string' ? x.cover : undefined,
        lastChapterRead: Number(x.lastChapterRead || x.progress || 0),
        lastPageRead: Number(x.lastPageRead || 0),
        totalChapters: Number(x.totalChapters || 0) || undefined,
        favorite: x.favorite !== false,
      })),
      warnings: [],
    };
  }
  throw new Error('Supported backups: .tachibk, .proto.gz, .tmb, .json');
}
