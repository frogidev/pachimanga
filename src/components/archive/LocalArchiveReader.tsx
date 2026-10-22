'use client';

import { useState, useCallback, useEffect } from 'react';
import { readArchive, revokePageUrls, createObjectUrl, getMimeType, type ArchiveResult } from '@/lib/archive/archive-reader';
import type { Page } from '@/types/models';

interface LocalArchiveReaderProps {
  onPagesLoad?: (pages: Page[], archive: ArchiveResult) => void;
  onError?: (error: string) => void;
}

export function LocalArchiveReader({ onPagesLoad, onError }: LocalArchiveReaderProps) {
  const [archive, setArchive] = useState<ArchiveResult | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [showReader, setShowReader] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pages.length > 0) {
        revokePageUrls(pages);
      }
    };
  }, [pages]);

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await readArchive(file);
      setArchive(result);
      
      // Convert to pages with progress
      const newPages: Page[] = [];
      for (let i = 0; i < result.entries.length; i++) {
        const entry = result.entries[i];
        newPages.push({
          index: i,
          imageUrl: createObjectUrl(entry.data, getMimeType(entry.name)),
        });
        setProgress((i + 1) / result.entries.length);
      }
      
      setPages(newPages);
      setCurrentPage(result.coverIndex);
      setShowReader(true);
      onPagesLoad?.(newPages, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read archive';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [onPagesLoad, onError]);

  const goToPage = (page: number) => {
    if (page >= 0 && page < pages.length) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  if (!showReader || !archive) {
    return (
      <div className="surface-card p-8 rounded-xl border border-white/[.06] text-center">
        <div className="text-4xl mb-3">📚</div>
        <h3 className="font-semibold text-zinc-100 mb-2">Local Archive Reader</h3>
        <p className="text-zinc-500 mb-6 max-w-md mx-auto">
          Open CBZ, ZIP, or CBR archives directly in your browser. No upload required — everything stays on your device.
        </p>
        <input
          type="file"
          accept=".cbz,.zip,.cbr,.rar"
          className="sr-only"
          id="archive-input"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          disabled={loading}
        />
        <label htmlFor="archive-input" className="button-primary px-6 py-3 inline-block cursor-pointer">
          {loading ? 'Loading...' : 'Select Archive'}
        </label>
        {progress > 0 && progress < 1 && (
          <div className="mt-4 w-64 mx-auto h-2 bg-white/[.1] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-400 to-sky-300 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-100">{archive.entries[currentPage]?.name || 'Archive'}</h3>
          <p className="text-sm text-zinc-500">
            Page {currentPage + 1} of {archive.totalPages}
          </p>
        </div>
        <button
          className="button-secondary px-3 py-1.5 text-sm"
          onClick={() => { setShowReader(false); setPages([]); setArchive(null); }}
        >
          Close
        </button>
      </div>

      <div className="relative aspect-[2/3] max-w-3xl mx-auto overflow-hidden rounded-xl bg-[#0e0d14]">
        {pages[currentPage] && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: URL, nothing for next/image to optimize
          <img
            src={pages[currentPage].imageUrl}
            alt={`Page ${currentPage + 1}`}
            className="w-full h-full object-contain"
            onError={() => setError('Failed to load image')}
          />
        )}
        
        {/* Navigation overlays */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          onClick={prevPage}
          disabled={currentPage === 0}
          aria-label="Previous page"
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          onClick={nextPage}
          disabled={currentPage === pages.length - 1}
          aria-label="Next page"
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Thumbnail strip */}
      {archive.totalPages > 1 && (
        <div className="mt-4 h-24 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {archive.entries.map((entry, index) => (
              <button
                key={entry.name}
                className={`relative flex-shrink-0 w-16 h-24 rounded border-2 transition ${
                  index === currentPage
                    ? 'border-pink-400'
                    : 'border-transparent hover:border-white/[.2]'
                }`}
                onClick={() => goToPage(index)}
                aria-label={`Page ${index + 1}`}
                aria-current={index === currentPage ? 'page' : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL */}
                <img
                  src={pages[index]?.imageUrl}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
                {index === archive.coverIndex && (
                  <span className="absolute top-1 left-1 text-xs bg-pink-400 text-black px-1 rounded">Cover</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard navigation */}
      <div
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') prevPage();
          if (e.key === 'ArrowRight') nextPage();
          if (e.key === 'Escape') { setShowReader(false); setPages([]); setArchive(null); }
        }}
        tabIndex={0}
        className="outline-none"
        aria-label="Archive reader"
      />
    </div>
  );
}