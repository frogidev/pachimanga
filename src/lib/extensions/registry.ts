'use client';

import JSZip from 'jszip';
import type { InstalledExtension, ExtensionManifest, ExtensionSource } from './types';
import { loadSandboxedExtension, validateExtensionCode, type SandboxedExtension } from './sandbox';
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
    return { success: false, error: 'ext.err.duplicate' };
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

export async function installExtensionFromZip(file: File): Promise<{ success: boolean; extension?: InstalledExtension; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Look for manifest file
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      return { success: false, error: 'ext.err.no_manifest' };
    }
    
    const manifestContent = await manifestFile.async('text');
    let manifest: ExtensionManifest | null = null;
    
    try {
      manifest = JSON.parse(manifestContent);
    } catch (e) {
      return { success: false, error: `ext.err.invalid_manifest|${e instanceof Error ? e.message : ''}` };
    }
    
    if (!manifest) {
      return { success: false, error: 'ext.err.manifest_null' };
    }
    
    // Validate required manifest fields
    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'sourceId', 'sourceName'];
    for (const field of requiredFields) {
      if (!manifest[field as keyof ExtensionManifest]) {
        return { success: false, error: `ext.err.missing_field|${field}` };
      }
    }
    
    // Look for source file
    const sourceFile = zip.file('source.js') || zip.file('index.js') || zip.file('main.js');
    if (!sourceFile) {
      return { success: false, error: 'ext.err.no_source' };
    }
    
    const sourceCode = await sourceFile.async('text');
    
    // Validate the source code
    const validation = await validateExtensionCode(sourceCode);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Check manifest consistency
    if (validation.manifest && validation.manifest.id !== manifest.id) {
      return { success: false, error: 'ext.err.id_mismatch' };
    }
    
    const existingExtensions = getStoredExtensions();
    if (existingExtensions.some(ext => ext.manifest.id === manifest.id)) {
      return { success: false, error: 'ext.err.duplicate' };
    }
    
    const extension: InstalledExtension = {
      manifest,
      code: sourceCode,
      installedAt: new Date().toISOString(),
      enabled: true,
    };
    
    const existingExtensionsList = getStoredExtensions();
    existingExtensionsList.push(extension);
    setStoredExtensions(existingExtensionsList);
    
    return { success: true, extension };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'ext.err.install_zip' };
  }
}

export function uninstallExtension(extensionId: string): boolean {
  const extensions = getStoredExtensions();
  const index = extensions.findIndex(ext => ext.manifest.id === extensionId);
  if (index === -1) return false;

  extensions.splice(index, 1);
  setStoredExtensions(extensions);
  loadedExtensions.get(extensionId)?.destroy();
  loadedExtensions.delete(extensionId);
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

const loadedExtensions: Map<string, SandboxedExtension> = new Map();

export async function loadExtensionSource(extension: InstalledExtension): Promise<ExtensionSource | null> {
  try {
    const loaded = await loadSandboxedExtension(extension.code);
    loadedExtensions.get(extension.manifest.id)?.destroy();
    loadedExtensions.set(extension.manifest.id, loaded);
    return loaded.source;
  } catch (error) {
    console.error(`Failed to load extension ${extension.manifest.id}:`, error);
    return null;
  }
}

export async function getExtensionSource(extensionId: string): Promise<ExtensionSource | null> {
  const cached = loadedExtensions.get(extensionId);
  if (cached) return cached.source;

  const extension = getExtension(extensionId);
  if (!extension || !extension.enabled) return null;

  return loadExtensionSource(extension);
}

export function clearExtensionCache(): void {
  for (const loaded of loadedExtensions.values()) loaded.destroy();
  loadedExtensions.clear();
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