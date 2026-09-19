"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { effectiveSpeed, nextMultiplier } from "@/features/reader/auto-scroll";
import { useReducedMotion } from "@/features/reader/prefers-reduced-motion";
import { getPreloadWindow } from "@/features/reader/preload";
import { initialReaderState, readerReducer, readerResumeScrollTop } from "@/features/reader/reader-state";
import { effectiveReaderSettings, setTitleReaderPreset } from "@/features/reader/presets";
import { useScreenWakeLock } from "@/features/reader/use-screen-wake-lock";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { DEFAULT_READER_SETTINGS, getProgress, getReaderSettingsSnapshot, saveProgress, saveReaderSettings, subscribeReaderSettings } from "@/lib/storage/reader-storage";
import type { Chapter, Manga, Page, ReaderSettings, ReadingProgress } from "@/types/models";

export function ReaderView({ manga, chapter, chapters, pages, routeBasePath = "/reader", mangaBasePath = "/manga" }: {
  manga: Manga; chapter: Chapter; chapters: Chapter[]; pages: Page[]; routeBasePath?: string; mangaBasePath?: string;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(readerReducer, initialReaderState);
  const storedSettings = useSyncExternalStore(subscribeReaderSettings, getReaderSettingsSnapshot, () => DEFAULT_READER_SETTINGS);
  const settings = useMemo(() => effectiveReaderSettings(storedSettings, manga.id), [manga.id, storedSettings]);
  const reducedMotion = useReducedMotion();
  const wakeLock = useScreenWakeLock(Boolean(settings.keepScreenAwake));
  const [loadedChapterId, setLoadedChapterId] = useState<string | null>(null);
  const [resumeState, setResumeState] = useState<{ chapterId: string; progress: ReadingProgress | null } | null>(null);
  const [offlineState, setOfflineState] = useState<{ saved: number; total: number } | null>(null);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [failedPages, setFailedPages] = useState<Record<string, Record<number, boolean>>>({});
  const [pageRetryVersion, setPageRetryVersion] = useState<Record<string, Record<number, number>>>({});
  const saveTimer = useRef<number | undefined>(undefined);
  const scrollFrame = useRef<number | undefined>(undefined);
  const touchStartY = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const offlineAbortRef = useRef<AbortController | null>(null);

  const hydrated = loadedChapterId === chapter.id;
  const resumeProgress = resumeState?.chapterId === chapter.id ? resumeState.progress : null;
  const chapterIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : undefined;
  const nextChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : undefined;
  const speed = useMemo(() => effectiveSpeed(settings.baseSpeedPxPerSecond, settings.autoScrollMultiplier), [settings]);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const navigateChapter = useCallback((chapterId: string) => {
    // Chapter hops stay within one reader history entry so browser/Android Back
    // returns to the surface that opened the reader instead of replaying chapters.
    router.replace(`${routeBasePath}/${chapterId}`);
  }, [routeBasePath, router]);
  useAutoScroll({ playing: state.autoScrollPlaying && !reducedMotion, speedPxPerSecond: speed, onEnd: pause });

  const currentScrollPercentage = useCallback(() => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(100, (window.scrollY / maxScroll) * 100));
  }, []);

  const updateProgressIndicator = useCallback(() => {
    const percentage = currentScrollPercentage();
    const element = progressBarRef.current;
    if (element) {
      element.style.transform = `scaleX(${percentage / 100})`;
      element.setAttribute("aria-valuenow", String(Math.round(percentage)));
    }
    return percentage;
  }, [currentScrollPercentage]);

  const persistCurrentProgress = useCallback(() => {
    if (!hydrated) return;
    const percentage = currentScrollPercentage();
    void saveProgress({ mangaId: manga.id, chapterId: chapter.id, pageIndex: state.currentPageIndex, scrollPosition: window.scrollY, percentage, updatedAt: new Date().toISOString() });
  }, [chapter.id, currentScrollPercentage, hydrated, manga.id, state.currentPageIndex]);

  const scrollToPage = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(pages.length - 1, index));
    const target = document.querySelector<HTMLElement>(`[data-page-index="${bounded}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    dispatch({ type: "page", index: bounded });
    dispatch({ type: "show-controls" });
  }, [pages.length, reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    void getProgress(chapter.id)
      .then((progress) => {
        if (cancelled) return;
        setResumeState({ chapterId: chapter.id, progress: progress ?? null });
        dispatch({ type: "page", index: progress?.pageIndex ?? 0 });
        setLoadedChapterId(chapter.id);
      })
      .catch(() => {
        if (cancelled) return;
        setResumeState({ chapterId: chapter.id, progress: null });
        dispatch({ type: "page", index: 0 });
        setLoadedChapterId(chapter.id);
      });
    return () => { cancelled = true; };
  }, [chapter.id]);

  useEffect(() => {
    if (!hydrated || !resumeProgress) return;
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const top = readerResumeScrollTop(
          resumeProgress,
          document.documentElement.scrollHeight,
          window.innerHeight,
        );
        window.scrollTo({ top, behavior: "instant" });
        updateProgressIndicator();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [chapter.id, hydrated, resumeProgress, updateProgressIndicator]);

  useEffect(() => {
    if (!hydrated) return;
    const onScroll = () => {
      if (scrollFrame.current) return;
      scrollFrame.current = requestAnimationFrame(() => {
        scrollFrame.current = undefined;
        updateProgressIndicator();
        const element = document.elementFromPoint(window.innerWidth / 2, Math.min(window.innerHeight * 0.55, window.innerHeight - 1));
        const pageElement = element?.closest<HTMLElement>("[data-page-index]");
        const index = Number(pageElement?.dataset.pageIndex ?? state.currentPageIndex);
        if (Number.isFinite(index) && index !== state.currentPageIndex) dispatch({ type: "page", index });
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(persistCurrentProgress, 500);
      });
    };
    updateProgressIndicator();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      persistCurrentProgress();
    };
  }, [hydrated, persistCurrentProgress, state.currentPageIndex, updateProgressIndicator]);

  useEffect(() => {
    const upcoming = getPreloadWindow(pages, state.currentPageIndex, settings.preloadPages || 2);
    const preloads = upcoming.map((page) => { const image = new window.Image(); image.decoding = "async"; image.src = page.imageUrl; return image; });
    return () => { preloads.forEach((image) => { image.src = ""; }); };
  }, [pages, settings.preloadPages, state.currentPageIndex]);

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
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [pause, state.autoScrollPlaying]);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    let current = getReaderSettingsSnapshot();
    if (patch.fitMode || patch.preloadPages) current = setTitleReaderPreset(current, manga.id, null);
    saveReaderSettings({ ...current, ...patch });
  }, [manga.id]);

  const applyTitlePreset = useCallback((preset: "manga" | "webtoon" | null) => {
    saveReaderSettings(setTitleReaderPreset(getReaderSettingsSnapshot(), manga.id, preset));
  }, [manga.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.code === "Space") { event.preventDefault(); dispatch({ type: "toggle-play" }); }
      else if (event.key === "+" || event.key === "=") updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, 1) });
      else if (event.key === "-" || event.key === "_") updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, -1) });
      else if (event.key === "PageUp") { event.preventDefault(); scrollToPage(state.currentPageIndex - 1); }
      else if (event.key === "PageDown") { event.preventDefault(); scrollToPage(state.currentPageIndex + 1); }
      else if (event.key === "ArrowLeft" && previousChapter) navigateChapter(previousChapter.id);
      else if (event.key === "ArrowRight" && nextChapter) navigateChapter(nextChapter.id);
      else if (event.key === "Escape" && document.fullscreenElement) void document.exitFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigateChapter, nextChapter, previousChapter, scrollToPage, settings.autoScrollMultiplier, state.currentPageIndex, updateSettings]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  }
  const toggleControls = () => dispatch({ type: state.controlsVisible ? "hide-controls" : "show-controls" });

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/offline/chapter-cache").then(({ getCachedChapterCount, uniquePageUrls }) =>
      getCachedChapterCount(uniquePageUrls(pages)).then((saved) => {
        if (!cancelled) setOfflineState({ saved, total: pages.length });
      }),
    );
    return () => { cancelled = true; };
  }, [chapter.id, pages]);

  async function toggleChapterOffline() {
    if (offlineBusy) {
      offlineAbortRef.current?.abort();
      return;
    }
    const controller = new AbortController();
    offlineAbortRef.current = controller;
    setOfflineBusy(true);
    setOfflineError(null);
    try {
      const { cacheChapterPages, forgetOfflineChapter, rememberOfflineChapter, removeChapterPages, uniquePageUrls } = await import("@/lib/offline/chapter-cache");
      const urls = uniquePageUrls(pages);
      const fullySaved = Boolean(offlineState && offlineState.total > 0 && offlineState.saved >= offlineState.total);
      if (fullySaved) {
        await removeChapterPages(urls);
        await forgetOfflineChapter(manga.id, chapter.id);
        setOfflineState({ saved: 0, total: urls.length });
      } else {
        const result = await cacheChapterPages(
          urls,
          (saved, total) => setOfflineState({ saved, total }),
          { signal: controller.signal },
        );
        setOfflineState({ saved: result.saved, total: result.total });
        await rememberOfflineChapter({
          mangaId: manga.id,
          mangaTitle: manga.title,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          urls,
          savedCount: result.saved,
          total: result.total,
        });
        if (result.failed) setOfflineError(`${result.failed} page${result.failed === 1 ? "" : "s"} could not be cached.`);
      }
      window.dispatchEvent(new CustomEvent("pachimanga:offline-cache-change"));
    } catch (error) {
      setOfflineError(
        error instanceof Error && error.name === "AbortError"
          ? "Offline save cancelled."
          : error instanceof Error
            ? error.message
            : "Offline chapter storage is unavailable.",
      );
    } finally {
      if (offlineAbortRef.current === controller) offlineAbortRef.current = null;
      setOfflineBusy(false);
    }
  }

  const offlineComplete = Boolean(offlineState && offlineState.total > 0 && offlineState.saved >= offlineState.total);

  return (
    <div className="min-h-dvh bg-black text-white" onClick={toggleControls} onMouseMove={() => dispatch({ type: "show-controls" })}>
      <div ref={progressBarRef} role="progressbar" aria-label="Chapter reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} className="fixed inset-x-0 top-0 z-[70] h-1 origin-left scale-x-0 bg-sky-400 transition-transform duration-75 motion-reduce:transition-none" />

      <button type="button" onClick={(event) => { event.stopPropagation(); scrollToPage(state.currentPageIndex - 1); }} disabled={state.currentPageIndex <= 0} className="fixed bottom-[24%] left-0 top-[24%] z-20 w-[18vw] opacity-0 focus-visible:opacity-100 focus-visible:bg-white/[.04] disabled:pointer-events-none sm:hidden" aria-label="Previous page" />
      <button type="button" onClick={(event) => { event.stopPropagation(); scrollToPage(state.currentPageIndex + 1); }} disabled={state.currentPageIndex >= pages.length - 1} className="fixed bottom-[24%] right-0 top-[24%] z-20 w-[18vw] opacity-0 focus-visible:opacity-100 focus-visible:bg-white/[.04] disabled:pointer-events-none sm:hidden" aria-label="Next page" />

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
            <div key={page.index} data-page-index={index} className={`flex w-full flex-col items-center justify-center bg-zinc-900 [content-visibility:auto] [contain-intrinsic-size:1200px] ${index > 0 ? "border-t border-black" : ""}`}>
              {failedPages[chapter.id]?.[index] ? (
                <div className="grid min-h-80 w-full max-w-[800px] place-items-center px-6 py-12 text-center">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Page {index + 1} could not be loaded.</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-600">The provider image may be temporarily unavailable. Retrying does not change reading progress.</p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFailedPages((current) => ({
                          ...current,
                          [chapter.id]: { ...(current[chapter.id] || {}), [index]: false },
                        }));
                        setPageRetryVersion((current) => ({
                          ...current,
                          [chapter.id]: {
                            ...(current[chapter.id] || {}),
                            [index]: (current[chapter.id]?.[index] || 0) + 1,
                          },
                        }));
                      }}
                      className="button-secondary mt-4 px-4 py-2 text-xs"
                    >
                      Retry page
                    </button>
                  </div>
                </div>
              ) : (
                <Image
                  key={`${page.imageUrl}:${pageRetryVersion[chapter.id]?.[index] || 0}`}
                  src={page.imageUrl}
                  alt={`${manga.title} ${chapter.title}, page ${index + 1}`}
                  width={page.width ?? 1200}
                  height={page.height ?? 1800}
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  unoptimized
                  onError={() => setFailedPages((current) => ({
                    ...current,
                    [chapter.id]: { ...(current[chapter.id] || {}), [index]: true },
                  }))}
                  style={!hasDimensions && settings.fitMode === "width" ? { width: "100%", height: "auto" } : undefined}
                  className={settings.fitMode === "screen" ? "block h-auto max-h-[100svh] w-auto max-w-full object-contain" : "block h-auto w-full max-w-[1200px] object-contain"}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className={`fixed inset-x-0 top-0 z-50 transition duration-200 motion-reduce:transition-none ${state.controlsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/80 px-3 pb-2.5 pt-[calc(.6rem+env(safe-area-inset-top))] backdrop-blur-xl sm:gap-3 sm:px-5">
          <Link href={`${mangaBasePath}/${manga.id}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/8 text-lg hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" aria-label="Close reader">×</Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{manga.title}</p>
            <p className="truncate text-xs text-zinc-500">{chapter.title} · page {state.currentPageIndex + 1}/{pages.length}</p>
          </div>
          <label className="hidden max-w-56 sm:block">
            <span className="sr-only">Jump to chapter</span>
            <select value={chapter.id} onChange={(event) => navigateChapter(event.target.value)} className="h-10 max-w-56 rounded-xl border border-white/10 bg-zinc-950 px-2 text-xs text-zinc-300 outline-none focus:border-sky-300/60">
              {chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void toggleChapterOffline()} className="rounded-xl bg-white/8 px-2.5 py-2 text-xs text-zinc-300 hover:bg-white/12" aria-label={offlineBusy ? "Cancel offline chapter save" : offlineComplete ? "Remove downloaded chapter pages" : "Save chapter pages for offline reading"}>
            {offlineBusy ? `Cancel ${offlineState?.saved ?? 0}/${offlineState?.total ?? pages.length}` : offlineComplete ? "✓ Offline" : "↓ Offline"}
          </button>
          {wakeLock.supported ? (
            <button type="button" onClick={() => updateSettings({ keepScreenAwake: !settings.keepScreenAwake })} className={`hidden rounded-xl px-3 py-2 text-xs sm:block ${settings.keepScreenAwake ? "bg-amber-300/15 text-amber-200" : "bg-white/8 text-zinc-400 hover:bg-white/12"}`} aria-pressed={Boolean(settings.keepScreenAwake)} title={wakeLock.active ? "Screen wake lock active" : "Keep screen awake while reading"}>
              {wakeLock.active ? "Awake" : "Wake"}
            </button>
          ) : null}
          <button type="button" onClick={() => void toggleFullscreen()} className="hidden rounded-xl bg-white/8 px-3 py-2 text-xs text-zinc-300 hover:bg-white/12 sm:block">Fullscreen</button>
        </div>
        {offlineError ? <div className="mx-auto mt-2 w-fit max-w-[calc(100vw-2rem)] rounded-xl bg-red-950/90 px-3 py-2 text-xs text-red-200">{offlineError}</div> : null}
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-50 transition duration-200 motion-reduce:transition-none ${state.controlsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto max-w-xl px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-4">
          <div className="rounded-3xl border border-white/10 bg-black/85 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => dispatch({ type: "toggle-play" })} disabled={reducedMotion} title={reducedMotion ? "Auto-scroll stays off while your system requests reduced motion" : undefined} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-base font-black text-zinc-950 hover:bg-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-400" aria-label={reducedMotion ? "Auto-scroll unavailable with reduced motion" : state.autoScrollPlaying ? "Pause auto-scroll" : "Play auto-scroll"}>{state.autoScrollPlaying && !reducedMotion ? "Ⅱ" : "▶"}</button>
              <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-zinc-200">Auto-scroll</span><span className="tabular-nums text-zinc-500">{settings.autoScrollMultiplier.toFixed(settings.autoScrollMultiplier % 1 ? 2 : 0)}× · {Math.round(speed)} px/s</span></div><input type="range" min="0.1" max="5" step="0.05" value={settings.autoScrollMultiplier} onChange={(event) => updateSettings({ autoScrollMultiplier: Number(event.target.value) })} className="w-full accent-emerald-400" aria-label="Auto-scroll speed" /></div>
              <div className="flex shrink-0 gap-1"><button type="button" onClick={() => updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, -1) })} className="grid size-9 place-items-center rounded-xl bg-white/8 text-lg hover:bg-white/12" aria-label="Decrease auto-scroll speed">−</button><button type="button" onClick={() => updateSettings({ autoScrollMultiplier: nextMultiplier(settings.autoScrollMultiplier, 1) })} className="grid size-9 place-items-center rounded-xl bg-white/8 text-lg hover:bg-white/12" aria-label="Increase auto-scroll speed">+</button></div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-xs sm:hidden">
              <button type="button" disabled={state.currentPageIndex <= 0} onClick={() => scrollToPage(state.currentPageIndex - 1)} className="rounded-xl bg-white/8 px-2 py-2 text-zinc-300 disabled:opacity-25">Page ↑</button>
              <button type="button" onClick={() => updateSettings({ fitMode: settings.fitMode === "width" ? "screen" : "width" })} className="rounded-xl bg-white/8 px-2 py-2 text-zinc-300">Fit {settings.fitMode === "width" ? "width" : "screen"}</button>
              <button type="button" disabled={state.currentPageIndex >= pages.length - 1} onClick={() => scrollToPage(state.currentPageIndex + 1)} className="rounded-xl bg-white/8 px-2 py-2 text-zinc-300 disabled:opacity-25">Page ↓</button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-white/8 pt-3 text-xs">
              <button type="button" aria-pressed={storedSettings.titlePresets?.[manga.id] === "manga"} onClick={() => applyTitlePreset("manga")} className="rounded-xl bg-white/8 px-3 py-2 text-zinc-300 hover:bg-white/12">Manga preset</button>
              <button type="button" aria-pressed={storedSettings.titlePresets?.[manga.id] === "webtoon"} onClick={() => applyTitlePreset("webtoon")} className="rounded-xl bg-white/8 px-3 py-2 text-zinc-300 hover:bg-white/12">Webtoon preset</button>
              {storedSettings.titlePresets?.[manga.id] ? <button type="button" onClick={() => applyTitlePreset(null)} className="rounded-xl px-3 py-2 text-zinc-500 hover:bg-white/8 hover:text-white">Account default</button> : null}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <button type="button" disabled={!previousChapter} onClick={() => previousChapter && navigateChapter(previousChapter.id)} className="rounded-xl px-3 py-2 text-zinc-400 hover:bg-white/8 hover:text-white disabled:opacity-25">← Previous chapter</button>
              <button type="button" onClick={() => updateSettings({ fitMode: settings.fitMode === "width" ? "screen" : "width" })} className="hidden rounded-xl bg-white/8 px-3 py-2 text-zinc-300 hover:bg-white/12 sm:block">Fit {settings.fitMode === "width" ? "width" : "screen"}</button>
              <button type="button" disabled={!nextChapter} onClick={() => nextChapter && navigateChapter(nextChapter.id)} className="rounded-xl px-3 py-2 text-zinc-400 hover:bg-white/8 hover:text-white disabled:opacity-25">Next chapter →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
