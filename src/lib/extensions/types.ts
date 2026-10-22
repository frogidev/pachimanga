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

export interface ExtensionContext {
  fetch: typeof fetch;
  console: Console;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
  Promise: PromiseConstructor;
  JSON: typeof JSON;
  Math: typeof Math;
  Date: DateConstructor;
  Object: ObjectConstructor;
  Array: ArrayConstructor;
  String: StringConstructor;
  Number: NumberConstructor;
  Boolean: BooleanConstructor;
  Map: MapConstructor;
  Set: SetConstructor;
  RegExp: RegExpConstructor;
  Error: ErrorConstructor;
  TypeError: TypeErrorConstructor;
  URIError: URIErrorConstructor;
  encodeURIComponent: typeof encodeURIComponent;
  decodeURIComponent: typeof decodeURIComponent;
  btoa: typeof btoa;
  atob: typeof atob;
  URL: typeof URL;
  URLSearchParams: typeof URLSearchParams;
  Headers: typeof Headers;
  Request: typeof Request;
  Response: typeof Response;
  FormData: typeof FormData;
  Blob: typeof Blob;
  crypto: Crypto;
}

export interface ExtensionSandbox {
  run(code: string, context: ExtensionContext): Promise<ExtensionSource>;
  terminate(): void;
}