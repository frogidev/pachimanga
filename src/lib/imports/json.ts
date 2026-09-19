import type {
  ImportCollection,
  ImportCollectionMembership,
  ImportManga,
  ImportProgress,
  ImportReaderSettings,
  ImportResult,
  ImportTrackerLink,
} from './types';

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

function validIso(value: unknown) {
  const text = optionalString(value);
  return text && Number.isFinite(Date.parse(text)) ? text : undefined;
}

function safeReaderSettings(value: unknown): ImportReaderSettings | undefined {
  const input = objectRecord(value);
  if (!input) return undefined;
  const output: ImportReaderSettings = {};
  if (typeof input.autoScrollMultiplier === 'number' && Number.isFinite(input.autoScrollMultiplier)) output.autoScrollMultiplier = input.autoScrollMultiplier;
  if (typeof input.baseSpeedPxPerSecond === 'number' && Number.isFinite(input.baseSpeedPxPerSecond)) output.baseSpeedPxPerSecond = input.baseSpeedPxPerSecond;
  if (input.fitMode === 'width' || input.fitMode === 'screen') output.fitMode = input.fitMode;
  if (input.theme === 'dark' || input.theme === 'light') output.theme = input.theme;
  if (typeof input.keepScreenAwake === 'boolean') output.keepScreenAwake = input.keepScreenAwake;
  if ([1, 2, 3, 4].includes(Number(input.preloadPages))) output.preloadPages = Number(input.preloadPages) as 1 | 2 | 3 | 4;
  if (input.defaultPreset === 'manga' || input.defaultPreset === 'webtoon') output.defaultPreset = input.defaultPreset;
  if (input.titlePresets && typeof input.titlePresets === 'object' && !Array.isArray(input.titlePresets)) {
    output.titlePresets = Object.fromEntries(Object.entries(input.titlePresets as Record<string, unknown>).filter(([id, preset]) => id.length <= 160 && (preset === 'manga' || preset === 'webtoon')).slice(-200)) as Record<string, 'manga' | 'webtoon'>;
  }
  return Object.keys(output).length ? output : undefined;
}

function parsePachimangaExport(root: Record<string, unknown>): ImportResult | null {
  if (root.format !== 'pachimanga-account-export') return null;
  if (root.version !== 1 && root.version !== 2) throw new Error('Unsupported Pachimanga export version.');

  const library = Array.isArray(root.library) ? root.library : [];
  if (library.length > MAX_JSON_RECORDS) {
    throw new Error(`Pachimanga export contains ${library.length} library records; maximum supported is ${MAX_JSON_RECORDS}.`);
  }

  const warnings: string[] = [];
  const manga: ImportManga[] = [];
  for (const [index, raw] of library.entries()) {
    const row = objectRecord(raw);
    const title = optionalString(row?.title);
    const sourceId = optionalString(row?.source_id);
    const mangaId = optionalString(row?.manga_id);
    if (!row || !title || !sourceId || !mangaId) {
      warnings.push(`Skipped Pachimanga library row ${index + 1}: missing title/source_id/manga_id.`);
      continue;
    }

    manga.push({
      title,
      sourceId,
      mangaId,
      coverUrl: optionalString(row.cover_url),
      favorite: true,
      totalChapters: nonNegativeNumber(row.chapter_count),
      readingStatus: optionalString(row.reading_status),
      readingStatusManual: row.reading_status_manual === true,
      publicationStatus: optionalString(row.publication_status),
    });
  }

  const historyByManga = new Map<string, { chapterId?: string; readAt?: string }>();
  for (const raw of Array.isArray(root.history) ? root.history : []) {
    const row = objectRecord(raw);
    const mangaId = optionalString(row?.manga_id);
    if (!row || !mangaId) continue;
    historyByManga.set(mangaId, {
      chapterId: optionalString(row.chapter_id),
      readAt: validIso(row.read_at),
    });
  }

  const progress: ImportProgress[] = [];
  const rawProgress = Array.isArray(root.progress) ? root.progress : [];
  if (rawProgress.length > MAX_JSON_RECORDS * 20) {
    throw new Error('Pachimanga export contains too many progress rows.');
  }
  for (const [index, raw] of rawProgress.entries()) {
    const row = objectRecord(raw);
    const sourceId = optionalString(row?.source_id);
    const mangaId = optionalString(row?.manga_id);
    const chapterId = optionalString(row?.chapter_id);
    const updatedAt = validIso(row?.updated_at);
    const scrollProgress = nonNegativeNumber(row?.scroll_progress);
    if (!row || !sourceId || !mangaId || !chapterId || !updatedAt || scrollProgress == null) {
      if (warnings.length < MAX_WARNING_DETAILS) warnings.push(`Skipped Pachimanga progress row ${index + 1}: invalid identifiers, timestamp, or progress.`);
      continue;
    }
    const history = historyByManga.get(mangaId);
    progress.push({
      sourceId,
      mangaId,
      chapterId,
      pageIndex: Math.max(0, Math.floor(nonNegativeNumber(row.page_index) || 0)),
      percentage: Math.max(0, Math.min(100, scrollProgress * 100)),
      updatedAt,
      historyReadAt: history?.chapterId === chapterId ? history.readAt : undefined,
    });
  }

  const collections: ImportCollection[] = [];
  const rawCollections = Array.isArray(root.collections) ? root.collections : [];
  if (rawCollections.length > MAX_JSON_RECORDS) throw new Error('Pachimanga export contains too many collections.');
  for (const [index, raw] of rawCollections.entries()) {
    const row = objectRecord(raw);
    const id = optionalString(row?.id);
    const name = optionalString(row?.name);
    if (!row || !id || !name) {
      if (warnings.length < MAX_WARNING_DETAILS) warnings.push(`Skipped collection ${index + 1}: missing id/name.`);
      continue;
    }
    collections.push({ id, name });
  }

  const collectionMemberships: ImportCollectionMembership[] = [];
  const rawMemberships = Array.isArray(root.collectionItems) ? root.collectionItems : [];
  if (rawMemberships.length > MAX_JSON_RECORDS * 20) throw new Error('Pachimanga export contains too many collection memberships.');
  for (const [index, raw] of rawMemberships.entries()) {
    const row = objectRecord(raw);
    const collectionId = optionalString(row?.collection_id);
    const sourceId = optionalString(row?.source_id);
    const mangaId = optionalString(row?.manga_id);
    if (!row || !collectionId || !sourceId || !mangaId) {
      if (warnings.length < MAX_WARNING_DETAILS) warnings.push(`Skipped collection membership ${index + 1}: invalid identifiers.`);
      continue;
    }
    collectionMemberships.push({ collectionId, sourceId, mangaId });
  }

  const trackerLinks: ImportTrackerLink[] = [];
  const rawTrackerLinks = Array.isArray(root.trackerLinks) ? root.trackerLinks : [];
  if (rawTrackerLinks.length > MAX_JSON_RECORDS * 4) throw new Error('Pachimanga export contains too many tracker links.');
  for (const raw of rawTrackerLinks) {
    const row = objectRecord(raw);
    const provider = row?.provider === 'anilist' || row?.provider === 'myanimelist' ? row.provider : undefined;
    const sourceId = optionalString(row?.source_id);
    const mangaId = optionalString(row?.manga_id);
    const mediaId = optionalString(row?.media_id);
    const mediaTitle = optionalString(row?.media_title);
    if (provider && sourceId && mangaId && mediaId && mediaTitle) trackerLinks.push({ provider, sourceId, mangaId, mediaId, mediaTitle });
  }

  const readerRoot = objectRecord(root.readerSettings);
  const readerSettings = safeReaderSettings(readerRoot?.settings);

  if (!manga.length && library.length) throw new Error('Pachimanga export contains no valid library rows.');
  return {
    format: 'pachimanga',
    manga,
    warnings,
    progress,
    readerSettings,
    collections,
    collectionMemberships,
    trackerLinks,
  };
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
  const root = objectRecord(value);
  if (root) {
    const pachimanga = parsePachimangaExport(root);
    if (pachimanga) return pachimanga;
  }

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
