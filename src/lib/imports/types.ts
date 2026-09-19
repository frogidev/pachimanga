export type ImportManga = {
  title: string;
  sourceUrl?: string;
  coverUrl?: string;
  favorite?: boolean;
  lastChapterRead?: number;
  lastPageRead?: number;
  totalChapters?: number;
  categories?: string[];
  sourceId?: string;
  mangaId?: string;
  readingStatus?: string;
  readingStatusManual?: boolean;
  publicationStatus?: string;
};

export type ImportProgress = {
  sourceId: string;
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  percentage: number;
  updatedAt: string;
  historyReadAt?: string;
};

export type ImportCollection = {
  id: string;
  name: string;
};

export type ImportCollectionMembership = {
  collectionId: string;
  sourceId: string;
  mangaId: string;
};

export type ImportReaderSettings = {
  autoScrollMultiplier?: number;
  baseSpeedPxPerSecond?: number;
  fitMode?: 'width' | 'screen';
  theme?: 'dark' | 'light';
  keepScreenAwake?: boolean;
  preloadPages?: 1 | 2 | 3 | 4;
  defaultPreset?: 'manga' | 'webtoon';
  titlePresets?: Record<string, 'manga' | 'webtoon'>;
};

export type ImportResult = {
  format: 'image' | 'tachiyomi' | 'tachimanga' | 'json' | 'pachimanga';
  manga: ImportManga[];
  warnings: string[];
  progress?: ImportProgress[];
  readerSettings?: ImportReaderSettings;
  collections?: ImportCollection[];
  collectionMemberships?: ImportCollectionMembership[];
};
