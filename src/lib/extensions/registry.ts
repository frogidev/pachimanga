'use client';

import type { InstalledExtension, ExtensionManifest, ExtensionSource } from './types';
import { createExtensionSandbox, validateExtensionCode } from './sandbox';
import type { MangaSource } from '@/sources/core/manga-source';

const STORAGE_KEY = 'pachimanga-extensions';

function getStoredExtensions(): InstalledExtension[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStoredExtensions(extensions: InstalledExtension[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extensions));
}

export async function installExtension(code: string, manifest?: ExtensionManifest): Promise<{ success: boolean; extension?: InstalledExtension; error?: string }> {
  const validation = await validateExtensionCode(code);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const finalManifest = manifest || validation.manifest!;
  const existingExtensions = getStoredExtensions();

  if (existingExtensions.some(ext => ext.manifest.id === finalManifest.id)) {
    return { success: false, error: 'Extension with this ID is already installed' };
  }

  const extension: InstalledExtension = {
    manifest: finalManifest,
    code,
    installedAt: new Date().toISOString(),
    enabled: true,
  };

  existingExtensions.push(extension);
  setStoredExtensions(existingExtensions);

  return { success: true, extension };
}

export function uninstallExtension(extensionId: string): boolean {
  const extensions = getStoredExtensions();
  const index = extensions.findIndex(ext => ext.manifest.id === extensionId);
  if (index === -1) return false;

  extensions.splice(index, 1);
  setStoredExtensions(extensions);
  return true;
}

export function toggleExtension(extensionId: string): boolean {
  const extensions = getStoredExtensions();
  const extension = extensions.find(ext => ext.manifest.id === extensionId);
  if (!extension) return false;

  extension.enabled = !extension.enabled;
  setStoredExtensions(extensions);
  return true;
}

export function getInstalledExtensions(): InstalledExtension[] {
  return getStoredExtensions();
}

export function getEnabledExtensions(): InstalledExtension[] {
  return getStoredExtensions().filter(ext => ext.enabled);
}

export function getExtension(extensionId: string): InstalledExtension | undefined {
  return getStoredExtensions().find(ext => ext.manifest.id === extensionId);
}

export function updateExtensionSettings(extensionId: string, settings: Record<string, unknown>): boolean {
  const extensions = getStoredExtensions();
  const extension = extensions.find(ext => ext.manifest.id === extensionId);
  if (!extension) return false;

  extension.settings = settings;
  setStoredExtensions(extensions);
  return true;
}

const extensionSourcesCache: Map<string, ExtensionSource> = new Map();
let sandboxInstance: Awaited<ReturnType<typeof createExtensionSandbox>> | null = null;

async function getSandbox() {
  if (!sandboxInstance) {
    sandboxInstance = await createExtensionSandbox();
  }
  return sandboxInstance;
}

export async function loadExtensionSource(extension: InstalledExtension): Promise<ExtensionSource | null> {
  try {
    const sandbox = await getSandbox();
    const context = {
      fetch: fetch.bind(window),
      console: console,
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      setInterval: window.setInterval.bind(window),
      clearInterval: window.clearInterval.bind(window),
      Promise: window.Promise,
      JSON: window.JSON,
      Math: window.Math,
      Date: window.Date,
      Object: window.Object,
      Array: window.Array,
      String: window.String,
      Number: window.Number,
      Boolean: window.Boolean,
      Map: window.Map,
      Set: window.Set,
      RegExp: window.RegExp,
      Error: window.Error,
      TypeError: window.TypeError,
      URIError: window.URIError,
      encodeURIComponent: window.encodeURIComponent,
      decodeURIComponent: window.decodeURIComponent,
      btoa: window.btoa,
      atob: window.atob,
      URL: window.URL,
      URLSearchParams: window.URLSearchParams,
      Headers: window.Headers,
      Request: window.Request,
      Response: window.Response,
      FormData: window.FormData,
      Blob: window.Blob,
      crypto: window.crypto,
    };

    const source = await sandbox.run(extension.code, context);
    extensionSourcesCache.set(extension.manifest.id, source);
    return source;
  } catch (error) {
    console.error(`Failed to load extension ${extension.manifest.id}:`, error);
    return null;
  }
}

export async function getExtensionSource(extensionId: string): Promise<ExtensionSource | null> {
  if (extensionSourcesCache.has(extensionId)) {
    return extensionSourcesCache.get(extensionId)!;
  }

  const extension = getExtension(extensionId);
  if (!extension || !extension.enabled) return null;

  return loadExtensionSource(extension);
}

export function clearExtensionCache(): void {
  extensionSourcesCache.clear();
}

export function createMangaSourceFromExtension(extension: InstalledExtension, extensionSource: ExtensionSource): MangaSource {
  return {
    id: extension.manifest.sourceId,
    name: extension.manifest.sourceName,
    search: extensionSource.search,
    getManga: extensionSource.getManga,
    getChapters: extensionSource.getChapters,
    getChapterPages: extensionSource.getChapterPages,
  };
}