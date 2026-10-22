import type { Chapter, Manga, Page } from '@/types/models';

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  website?: string;
  sourceId: string;
  sourceName: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  permissions?: ExtensionPermission[];
  icon?: string;
  languages?: string[];
  contentRating?: 'everyone' | 'teen' | 'mature';
}

export type ExtensionPermission =
  | 'network'
  | 'storage'
  | 'notifications'
  | 'background';

export interface ExtensionSource {
  manifest: ExtensionManifest;
  search(query: string): Promise<Manga[]>;
  getManga(id: string): Promise<Manga>;
  getChapters(mangaId: string): Promise<Chapter[]>;
  getChapterPages(chapterId: string): Promise<Page[]>;
}

export interface InstalledExtension {
  manifest: ExtensionManifest;
  code: string;
  installedAt: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}
