import type { ImportManga, ImportResult } from './types';

const MAX_JSON_RECORDS = 10_000;
const MAX_WARNING_DETAILS = 100;

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function optionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function listFromRoot(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const root = objectRecord(value);
  if (!root) throw new Error('JSON backup must be an array or an object containing manga/library.');
  if (Array.isArray(root.manga)) return root.manga;
  if (Array.isArray(root.library)) return root.library;
  throw new Error('JSON backup object must contain a manga or library array.');
}

export function parseJsonBackupValue(value: unknown): ImportResult {
  const source = listFromRoot(value);
  if (source.length > MAX_JSON_RECORDS) {
    throw new Error(`JSON backup contains ${source.length} records; maximum supported is ${MAX_JSON_RECORDS}.`);
  }

  const manga: ImportManga[] = [];
  const warnings: string[] = [];
  let omittedWarnings = 0;
  const seen = new Set<string>();

  const warn = (message: string) => {
    if (warnings.length < MAX_WARNING_DETAILS) warnings.push(message);
    else omittedWarnings += 1;
  };

  source.forEach((raw, index) => {
    const row = objectRecord(raw);
    if (!row) {
      warn(`Skipped record ${index + 1}: expected an object.`);
      return;
    }

    const title = optionalString(row.title) || optionalString(row.name);
    if (!title) {
      warn(`Skipped record ${index + 1}: missing title/name.`);
      return;
    }

    const sourceUrl = optionalString(row.url) || optionalString(row.sourceUrl);
    const coverUrl = optionalString(row.coverUrl) || optionalString(row.cover);
    const dedupeKey = `${title.toLocaleLowerCase()}\u0000${sourceUrl || ''}`;
    if (seen.has(dedupeKey)) {
      warn(`Skipped duplicate record ${index + 1}: ${title}.`);
      return;
    }
    seen.add(dedupeKey);

    const lastChapterRead = nonNegativeNumber(row.lastChapterRead ?? row.progress);
    const lastPageRead = nonNegativeNumber(row.lastPageRead);
    const totalChapters = nonNegativeNumber(row.totalChapters);

    if ((row.lastChapterRead ?? row.progress) != null && lastChapterRead == null) {
      warn(`Record ${index + 1} (${title}): invalid lastChapterRead/progress; using 0.`);
    }
    if (row.lastPageRead != null && lastPageRead == null) {
      warn(`Record ${index + 1} (${title}): invalid lastPageRead; using 0.`);
    }
    if (row.totalChapters != null && totalChapters == null) {
      warn(`Record ${index + 1} (${title}): invalid totalChapters; ignoring it.`);
    }

    let categories: string[] | undefined;
    if (row.categories != null) {
      if (Array.isArray(row.categories)) {
        categories = row.categories
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean);
        if (categories.length !== row.categories.length) {
          warn(`Record ${index + 1} (${title}): ignored non-string/blank categories.`);
        }
      } else {
        warn(`Record ${index + 1} (${title}): categories must be an array; ignoring it.`);
      }
    }

    manga.push({
      title,
      sourceUrl,
      coverUrl,
      lastChapterRead: lastChapterRead ?? 0,
      lastPageRead: lastPageRead ?? 0,
      totalChapters: totalChapters && totalChapters > 0 ? totalChapters : undefined,
      favorite: typeof row.favorite === 'boolean' ? row.favorite : true,
      categories,
    });
  });

  if (omittedWarnings > 0) warnings.push(`${omittedWarnings} additional import warnings omitted.`);
  if (!manga.length && source.length > 0) {
    throw new Error('JSON backup contains no valid manga records.');
  }

  return { format: 'json', manga, warnings };
}

export function parseJsonBackupText(text: string): ImportResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error('JSON backup is not valid JSON.');
  }
  return parseJsonBackupValue(value);
}
