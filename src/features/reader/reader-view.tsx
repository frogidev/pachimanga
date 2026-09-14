"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { effectiveSpeed, nextMultiplier } from "@/features/reader/auto-scroll";
import { useReducedMotion } from "@/features/reader/prefers-reduced-motion";
import { getPreloadWindow } from "@/features/reader/preload";
import { initialReaderState, readerReducer } from "@/features/reader/reader-state";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { DEFAULT_READER_SETTINGS, getProgress, getReaderSettingsSnapshot, saveProgress, saveReaderSettings, subscribeReaderSettings } from "@/lib/storage/reader-storage";
import type { Chapter, Manga, Page, ReaderSettings } from "@/types/models";

export function ReaderView({ manga, chapter, chapters, pages, routeBasePath = "/reader", mangaBasePath = "/manga" }: {
  manga: Manga; chapter: Chapter; chapters: Chapter[]; pages: Page[]; routeBasePath?: string; mangaBasePath?: string;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(readerReducer, initialReaderState);
  const settings = useSyncExternalStore(subscribeReaderSettings, getReaderSettingsSnapshot, () => DEFAULT_READER_SETTINGS);
  const reducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const scrollFrame = useRef<number | undefined>(undefined);
  const touchStartY = useRef<number | null>(null);

  const chapterIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : undefined;
  const nextChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : undefined;
  const speed = useMemo(() => effectiveSpeed(settings.baseSpeedPxPerSecond, settings.autoScrollMultiplier), [settings]);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  useAutoScroll({ playing: state.autoScrollPlaying && !reducedMotion, speedPxPerSecond: speed, onEnd: pause });

  const persistCurrentProgress = useCallback(() => {
    if (!hydrated) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percentage = Math.max(0, Math.min(100, (window.scrollY / maxScroll) * 100));
    void saveProgress({ mangaId: manga.id, chapterId: chapter.id, pageIndex: state.currentPageIndex, scrollPosition: window.scrollY, percentage, updatedAt: new Date().toISOString() });
  }, [chapter.id, hydrated, manga.id, state.currentPageIndex]);

  useEffect(() => {
    let cancelled = false;
    void getProgress(chapter.id).then((progress) => {
      if (cancelled) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (progress) window.scrollTo({ top: progress.scrollPosition, behavior: "instant" });
        setHydrated(true);
      }));
    });
    return () => { cancelled = true; };
  }, [chapter.id]);

  useEffect(() => {
    if (!hydrated) return;
    const onScroll = () => {
      if (scrollFrame.current) return;
      scrollFrame.current = requestAnimationFrame(() => {
        scrollFrame.current = undefined;
        const element = document.elementFromPoint(window.innerWidth / 2, Math.min(window.innerHeight * 0.55, window.innerHeight - 1));
        const pageElement = element?.closest<HTMLElement>("[data-page-index]");
        const index = Number(pageElement?.dataset.pageIndex ?? state.currentPageIndex);
        if (Number.isFinite(index) && index !== state.currentPageIndex) dispatch({ type: "page", index });
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(persistCurrentProgress, 500);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      persistCurrentProgress();
    };
  }, [hydrated, persistCurrentProgress, state.currentPageIndex]);

  useEffect(() => {
    const upcoming = getPreloadWindow(pages, state.currentPageIndex, 2);
    const preloads = upcoming.map((page) => { const image = new window.Image(); image.decoding = "async"; image.src = page.imageUrl; return image; });
    return () => { preloads.forEach((image) => { image.src = ""; }); };
  }, [pages, state.currentPageIndex]);

  useEffect(() => {
    if (!state.autoScrollPlaying || !state.controlsVisible) return;
    const timeout = window.setTimeout(() => dispatch({ type: "hide-controls" }), 2600);
    return () => window.clearTimeout(timeout);
  }, [state.autoScrollPlaying, state.controlsVisible]);

  useEffect(() => {
    const onWheel = () => { if (state.autoScrollPlaying) pause(); };
    const onTouchStart = (event: TouchEvent) => { touchStartY.current = event.touches[0]?.clientY ?? null; };
    const onTouchMove = (event: TouchEvent) => {
      const start = touchStartY.current; const y = event.touches[0]?.clientY;
      if (state.autoScrollPlaying && start !== null && y !== undefined && Math.abs(y - start) > 6) pause();
    };
    window.addEventListener("wheel", onWheel, { passive: true }); window.addEventListener("touchstart", onTouchStart, { passive: true }); window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("touchstart", onTouchStart); window.removeEventListener("touchmove", onTouchMove); };
  }, [pause, state.autoScrollPlaying]);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    saveReaderSettings({ ...getReaderSettingsSnapshot(), ...patch });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.code === "Space") { event.preventDefault(); dispatch({ type: "toggle-play" }); }
      else if (event.key === "+" || event.key === "=") updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, 1) });
      else if (event.key === "-" || event.key === "_") updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, -1) });
      else if (event.key === "ArrowLeft" && previousChapter) router.push(`${routeBasePath}/${previousChapter.id}`);
      else if (event.key === "ArrowRight" && nextChapter) router.push(`${routeBasePath}/${nextChapter.id}`);
      else if (event.key === "Escape" && document.fullscreenElement) void document.exitFullscreen();
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextChapter, previousChapter, routeBasePath, router, settings.autoScrollMultiplier, updateSettings]);

  async function toggleFullscreen() { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }
  const toggleControls = () => dispatch({ type: state.controlsVisible ? "hide-controls" : "show-controls" });

  return (
    <div className="min-h-dvh bg-black text-white" onClick={toggleControls} onMouseMove={() => dispatch({ type: "show-controls" })}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col items-center bg-zinc-950">
        {!hydrated ? (
          <div role="status" aria-label="Loading chapter" className="flex w-full flex-col items-center gap-3 py-10">
            {[0, 1].map((skeleton) => (
              <div key={skeleton} aria-hidden="true" className="aspect-[3/4] w-full max-w-[800px] animate-pulse rounded-lg bg-white/[.05]" />
            ))}
            <span className="text-sm text-zinc-500">Loading chapter…</span>
          </div>
        ) : pages.map((page, index) => {
          const hasDimensions = Boolean(page.width && page.height);
          return (
            <div key={page.index} data-page-index={index} className={`flex w-full flex-col items-center justify-center bg-zinc-900 ${index > 0 ? "border-t border-black" : ""}`}>
              {!hasDimensions && <div aria-hidden="true" className="aspect-[3/4] w-full max-w-[1200px] bg-white/[.04]" />}
              <Image
                src={page.imageUrl}
                alt={`${manga.title} ${chapter.title}, page ${index + 1}`}
                width={page.width ?? 1200}
                height={page.height ?? 1800}
                sizes="(max-width: 1200px) 100vw, 1200px"
                loading={index < 2 ? "eager" : "lazy"}
                unoptimized
                style={!hasDimensions && settings.fitMode === "width" ? { width: "100%", height: "auto" } : undefined}
                className={settings.fitMode === "screen" ? "block h-auto max-h-[100svh] w-auto max-w-full object-contain" : "block h-auto w-full max-w-[1200px] object-contain"}
              />
            </div>
          );
        })}

      </div>

      <div className={`fixed inset-x-0 top-0 z-50 transition duration-200 ${state.controlsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 bg-black/80 px-3 pt-[calc(.6rem+env(safe-area-inset-top))] pb-2.5 backdrop-blur-xl sm:px-5">
          <Link href={`${mangaBasePath}/${manga.id}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/8 text-lg hover:bg-white/12" aria-label="Close reader">×</Link>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{manga.title}</p><p className="truncate text-xs text-zinc-500">{chapter.title} · page {state.currentPageIndex + 1}/{pages.length}</p></div>
          <button type="button" onClick={() => void toggleFullscreen()} className="hidden rounded-xl bg-white/8 px-3 py-2 text-xs text-zinc-300 hover:bg-white/12 sm:block">Fullscreen</button>
        </div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-50 transition duration-200 ${state.controlsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto max-w-xl px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-4">
          <div className="rounded-3xl border border-white/10 bg-black/85 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => dispatch({ type: "toggle-play" })} disabled={reducedMotion} title={reducedMotion ? "Auto-scroll stays off while your system requests reduced motion" : undefined} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-base font-black text-zinc-950 hover:bg-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-400" aria-label={reducedMotion ? "Auto-scroll unavailable with reduced motion" : state.autoScrollPlaying ? "Pause auto-scroll" : "Play auto-scroll"}>{state.autoScrollPlaying && !reducedMotion ? "Ⅱ" : "▶"}</button>
              <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-zinc-200">Auto-scroll</span><span className="tabular-nums text-zinc-500">{settings.autoScrollMultiplier.toFixed(settings.autoScrollMultiplier % 1 ? 2 : 0)}× · {Math.round(speed)} px/s</span></div><input type="range" min="0.1" max="5" step="0.05" value={settings.autoScrollMultiplier} onChange={(event) => updateSettings({ autoScrollMultiplier: Number(event.target.value) })} className="w-full accent-emerald-400" aria-label="Auto-scroll speed" /></div>
              <div className="flex shrink-0 gap-1"><button type="button" onClick={() => updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, -1) })} className="grid size-9 place-items-center rounded-xl bg-white/8 text-lg hover:bg-white/12" aria-label="Decrease auto-scroll speed">−</button><button type="button" onClick={() => updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, 1) })} className="grid size-9 place-items-center rounded-xl bg-white/8 text-lg hover:bg-white/12" aria-label="Increase auto-scroll speed">+</button></div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-3 text-xs">
              <button type="button" disabled={!previousChapter} onClick={() => previousChapter && router.push(`${routeBasePath}/${previousChapter.id}`)} className="rounded-xl px-3 py-2 text-zinc-400 hover:bg-white/8 hover:text-white disabled:opacity-25">← Previous</button>
              <button type="button" onClick={() => updateSettings({ fitMode: settings.fitMode === "width" ? "screen" : "width" })} className="rounded-xl bg-white/8 px-3 py-2 text-zinc-300 hover:bg-white/12">Fit {settings.fitMode === "width" ? "width" : "screen"}</button>
              <button type="button" disabled={!nextChapter} onClick={() => nextChapter && router.push(`${routeBasePath}/${nextChapter.id}`)} className="rounded-xl px-3 py-2 text-zinc-400 hover:bg-white/8 hover:text-white disabled:opacity-25">Next →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
