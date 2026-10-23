import { CHAPTER_CACHE, type OfflineChapterRecord } from "./chapter-cache";
import { ImageNotExportableError, imagesToPdf, openPrintView, safeFileName } from "./pdf";

/** Bytes of one saved page: from the cache when readable, else a live CORS fetch (never a proxy). */
async function readablePage(url: string): Promise<Blob> {
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const cache = await caches.open(CHAPTER_CACHE);
      const hit = await cache.match(url);
      if (hit && hit.type !== "opaque") return await hit.blob();
    } catch { /* fall through to a live fetch */ }
  }
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch {
    throw new ImageNotExportableError();
  }
}

/** Bytes through the authenticated relay route, for hosts that block CORS (WeebCentral images). */
async function relayedPage(url: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/source/image?u=${encodeURIComponent(url)}`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch {
    throw new ImageNotExportableError();
  }
}

/** The relay only serves images a recent `pages` response listed, so ask for the chapter's pages first. */
async function primeRelayImages(record: OfflineChapterRecord) {
  if (!record.mangaId.startsWith("wc-")) return;
  await fetch(`/api/source/pages?source=weebcentral&chapterId=${encodeURIComponent(record.chapterId)}`, { cache: "no-store" }).catch(() => null);
}

async function* pageBlobs(record: OfflineChapterRecord) {
  let viaRelay = false;
  for (const url of record.urls) {
    if (!viaRelay) {
      try {
        yield await readablePage(url);
        continue;
      } catch (error) {
        if (!(error instanceof ImageNotExportableError)) throw error;
        // Direct read is blocked: use the relay for the rest of this chapter.
        viaRelay = true;
        await primeRelayImages(record);
      }
    }
    yield await relayedPage(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function chapterPdfName(record: Pick<OfflineChapterRecord, "mangaTitle" | "chapterTitle">) {
  return `${safeFileName(`${record.mangaTitle} - ${record.chapterTitle}`)}.pdf`;
}

/** Builds the chapter PDF; throws ImageNotExportableError when the image host blocks cross-origin reads. */
export function exportChapterPdf(record: OfflineChapterRecord, onPage?: (done: number) => void) {
  return imagesToPdf(pageBlobs(record), onPage);
}

export type MangaExportResult = { blob: Blob | null; exported: number; skipped: number };

/** One PDF per saved chapter, bundled in a ZIP. Chapters on blocking hosts are skipped and counted. */
export async function exportMangaZip(
  records: OfflineChapterRecord[],
  onChapter?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<MangaExportResult> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();
  let exported = 0;
  let skipped = 0;
  for (const record of records) {
    if (signal?.aborted) throw new DOMException("Export cancelled.", "AbortError");
    try {
      const pdf = await exportChapterPdf(record);
      let name = chapterPdfName(record);
      for (let n = 2; used.has(name); n += 1) name = chapterPdfName({ mangaTitle: record.mangaTitle, chapterTitle: `${record.chapterTitle} (${n})` });
      used.add(name);
      zip.file(name, pdf);
      exported += 1;
    } catch (error) {
      if (!(error instanceof ImageNotExportableError)) throw error;
      skipped += 1;
    }
    onChapter?.(exported + skipped, records.length);
  }
  return { blob: exported ? await zip.generateAsync({ type: "blob", compression: "STORE" }) : null, exported, skipped };
}

/** Print-dialog fallback for hosts that block direct export. */
export function printChapter(record: OfflineChapterRecord, hint: string) {
  return openPrintView(record.urls, `${record.mangaTitle} - ${record.chapterTitle}`, hint);
}

export { ImageNotExportableError, safeFileName };