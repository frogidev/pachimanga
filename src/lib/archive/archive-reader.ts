'use client';

import JSZip from 'jszip';
import type { Page } from '@/types/models';

export interface ArchiveEntry {
  name: string;
  data: Uint8Array;
  isImage: boolean;
}

export interface ArchiveResult {
  entries: ArchiveEntry[];
  coverIndex: number;
  totalPages: number;
}

export type ArchiveFormat = 'zip' | 'rar' | 'cbz' | 'cbr';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];
const ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr'];

export function isImageFile(name: string): boolean {
  const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
}

export function isArchiveFile(name: string): boolean {
  const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
  return ARCHIVE_EXTENSIONS.includes(ext);
}

export function getArchiveFormat(name: string): ArchiveFormat {
  const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
  if (ext === '.zip' || ext === '.cbz') return 'zip';
  if (ext === '.rar' || ext === '.cbr') return 'rar';
  return 'zip';
}

export async function readArchive(file: File): Promise<ArchiveResult> {
  const format = getArchiveFormat(file.name);
  
  if (format === 'rar') {
    // RAR support requires a browser-compatible unrar library
    // For now, throw a helpful error
    throw new Error('RAR/CBR format is not yet supported. Please convert to CBZ/ZIP format.');
  }
  
  return readZipArchive(file);
}

async function readZipArchive(file: File): Promise<ArchiveResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const entries: ArchiveEntry[] = [];
  
  for (const [name, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    if (!isImageFile(name)) continue;
    
    const data = await zipEntry.async('uint8array');
    entries.push({
      name,
      data,
      isImage: true,
    });
  }
  
  return processEntries(entries);
}

function processEntries(entries: ArchiveEntry[]): ArchiveResult {
  // Natural sort for proper page ordering
  entries.sort((a, b) => naturalSort(a.name, b.name));
  
  // Find cover (typically first image or one named 'cover')
  let coverIndex = 0;
  for (let i = 0; i < entries.length; i++) {
    const name = entries[i].name.toLowerCase();
    if (name.includes('cover') || name.includes('000') || name.includes('001')) {
      coverIndex = i;
      break;
    }
  }
  
  return {
    entries,
    coverIndex,
    totalPages: entries.length,
  };
}

function naturalSort(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g;
  const aParts = a.match(regex) || [];
  const bParts = b.match(regex) || [];
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    
    const aNum = parseInt(aPart, 10);
    const bNum = parseInt(bPart, 10);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      const cmp = aPart.localeCompare(bPart);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export function createObjectUrl(data: Uint8Array, mimeType: string): string {
  // Ensure we use a regular ArrayBuffer, not SharedArrayBuffer
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const blob = new Blob([new Uint8Array(arrayBuffer)], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function getMimeType(name: string): string {
  const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

export async function archiveToPages(archive: ArchiveResult): Promise<Page[]> {
  return archive.entries.map((entry, index) => ({
    index,
    imageUrl: createObjectUrl(entry.data, getMimeType(entry.name)),
    width: undefined,
    height: undefined,
  }));
}

export function revokePageUrls(pages: Page[]): void {
  for (const page of pages) {
    if (page.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(page.imageUrl);
    }
  }
}