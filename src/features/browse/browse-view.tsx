"use client";

import { useLocale } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { PageHeading } from "@/components/page-heading";
import {
  isTauriNative,
  nativeErrorMessage,
  probeNativeWeebCentral,
  searchNativeWeebCentral,
} from "@/lib/native/tauri-bridge";
import { getLibraryEntries } from "@/lib/storage/reader-storage";
import type { LibraryEntry, Manga } from "@/types/models";
import { readViewState, writeViewState } from "@/lib/ui/view-state";

const WEB_STATUS = "Search live WeebCentral results with duplicate titles collapsed.";
const NATIVE_STATUS = "Native shell detected. WeebCentral requests are sent from this device.";

type RuntimeMode = "checking" | "web" | "native";
type SourceHealth = "idle" | "checking" | "reachable" | "unreachable";
type SearchState = "idle" | "searching" | "done" | "error";

type WebRelayStatus = {
  configured?: boolean;
  reachable?: boolean;
  transport?: "relay" | "direct";
  error?: string;
};

type SearchResponse = {
  items?: Manga[];
  source?: string | null;
  sources?: string[];
  transport?: string;
  warning?: string;
  error?: string;
};

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

export function BrowseView() {
  const { t, contentLanguage } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Manga[]>([]);
  const [runtime, setRuntime] = useState<RuntimeMode>("checking");
  const [sourceHealth, setSourceHealth] = useState<SourceHealth>("idle");
  const [status, setStatus] = useState(WEB_STATUS);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [viewStateRestored, setViewStateRestored] = useState(false);

  useEffect(() => {
    const saved = readViewState("browse", { query: "" });
    const frame = requestAnimationFrame(() => {
      setQuery(saved.value.query || "");
      window.scrollTo({ top: saved.scrollY, behavior: "auto" });
      setViewStateRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!viewStateRestored) return;
    const save = () => writeViewState("browse", { query }, window.scrollY);
    writeViewState("browse", { query }, window.scrollY);
    window.addEventListener("pagehide", save);
    return () => { save(); window.removeEventListener("pagehide", save); };
  }, [query, viewStateRestored]);

  useEffect(() => {
    let cancelled = false;
    const refreshLibrary = () => {
      void getLibraryEntries()
        .then((entries) => {
          if (!cancelled) setLibraryEntries(entries);
        })
        .catch(() => {
          if (!cancelled) setLibraryEntries([]);
        });
    };
    refreshLibrary();
    window.addEventListener("pachimanga:library-change", refreshLibrary);
    return () => {
      cancelled = true;
      window.removeEventListener("pachimanga:library-change", refreshLibrary);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startupTimer = window.setTimeout(() => {
      if (cancelled) return;
      const native = isTauriNative();
      setRuntime(native ? "native" : "web");
      setStatus(native ? NATIVE_STATUS : WEB_STATUS);
      setSourceHealth("checking");

      if (native) {
        setSourceNotice("Native bridge detected · checking direct WeebCentral access from this device…");
        void probeNativeWeebCentral().then((probe) => {
          if (cancelled) return;
          setSourceHealth(probe.ok ? "reachable" : "unreachable");
          setSourceNotice(
            probe.ok
              ? "Native bridge connected · WeebCentral is reachable directly from this device."
              : `Native bridge connected, but WeebCentral health failed: ${probe.error || "unknown native error"}`,
          );
        });
      } else {
        setSourceNotice("Checking private WeebCentral relay for PWA/web…");
        void fetch("/api/source/weebcentral/status", { cache: "no-store" })
          .then(async (response) => {
            const body = (await response.json()) as WebRelayStatus;
            if (cancelled) return;
            const relayReady = Boolean(body.configured && body.reachable && body.transport === "relay");
            setSourceHealth(relayReady ? "reachable" : "unreachable");
            setSourceNotice(
              relayReady
                ? "Private WeebCentral relay connected · PWA/web can query WeebCentral."
                : body.configured
                  ? `Private relay is configured but unavailable${body.error ? `: ${body.error}` : "."}`
                  : "Private WeebCentral relay is not configured.",
            );
          })
          .catch((error) => {
            if (cancelled) return;
            setSourceHealth("unreachable");
            setSourceNotice(`Private relay health check failed: ${nativeErrorMessage(error)}`);
          });
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startupTimer);
    };
  }, []);

  useEffect(() => {
    if (runtime === "checking") return;
    const q = query.trim();
    const stateTimer = window.setTimeout(() => {
      if (!q) {
        setResults([]);
        setSearchState("idle");
        setSearchError(null);
        setStatus(runtime === "native" ? NATIVE_STATUS : WEB_STATUS);
      } else {
        setResults([]);
        setSearchState("searching");
        setSearchError(null);
      }
    }, 0);
    if (!q) return () => window.clearTimeout(stateTimer);

    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      // The native bridge only reaches WeebCentral (English); other languages use the server route.
      const useNative = runtime === "native" && contentLanguage === "en";
      setStatus(useNative ? "Searching live WeebCentral from this device…" : "Searching live manga sources…");
      if (useNative) setSourceNotice("Native WeebCentral search in progress…");

      if (useNative) {
        try {
          const nativeItems = await searchNativeWeebCentral(q);
          if (cancelled) return;
          if (nativeItems.length) {
            setResults(nativeItems);
            setSearchState("done");
            setSourceHealth("reachable");
            setSourceNotice(`Using WeebCentral directly from this device · ${nativeItems.length} result${nativeItems.length === 1 ? "" : "s"}.`);
            setStatus(`${nativeItems.length} readable result${nativeItems.length === 1 ? "" : "s"} from WeebCentral · native device connection`);
            return;
          }
          setResults([]);
          setSearchState("done");
          setSourceNotice("WeebCentral answered the native search with 0 matching titles.");
          setStatus(`0 readable titles returned by WeebCentral for “${q}”.`);
          return;
        } catch (error) {
          const nativeError = nativeErrorMessage(error);
          setSourceHealth("unreachable");
          setResults([]);
          setSearchState("error");
          setSearchError(nativeError);
          setStatus(`Live search failed: ${nativeError}`);
          setSourceNotice(`Native WeebCentral failed: ${nativeError}`);
          return;
        }
      }

      try {
        const response = await fetch(`/api/source/search?q=${encodeURIComponent(q)}&lang=${contentLanguage}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json() as SearchResponse;
        if (!response.ok) throw new Error(body.error || `Search failed with HTTP ${response.status}`);
        if (cancelled) return;

        const items = Array.isArray(body.items) ? body.items : [];
        const source = typeof body.source === "string" ? body.source : null;
        const sources = Array.isArray(body.sources) ? body.sources.filter((item): item is string => typeof item === "string") : source ? [source] : [];
        setResults(items);
        setSearchState("done");

        const viaRelay = runtime === "web" && sources.includes("WeebCentral") && body.transport === "relay";
        if (viaRelay) {
          setSourceHealth("reachable");
          setSourceNotice(`Using WeebCentral through the private relay · ${items.length} result${items.length === 1 ? "" : "s"}.`);
        } else if (body.warning) {
          setSourceHealth("unreachable");
          setSourceNotice(`Live source warning · ${body.warning}`);
        }

        if (items.length && source) {
          const fallbackNote = viaRelay ? " · private relay" : "";
          setStatus(`${items.length} readable result${items.length === 1 ? "" : "s"} from ${source}${fallbackNote}`);
        } else {
          setStatus(`0 readable titles returned by the live sources for “${q}”.`);
        }
      } catch (error) {
        if (!cancelled && (error as Error).name !== "AbortError") {
          const message = nativeErrorMessage(error);
          setResults([]);
          setSearchState("error");
          setSearchError(message);
          setStatus(`Live search failed: ${message}`);
          setSourceNotice(`Search failed: ${message}`);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(stateTimer);
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, retryNonce, runtime, contentLanguage]);

  const sourceDot = sourceHealth === "reachable"
    ? "bg-emerald-400"
    : sourceHealth === "unreachable"
      ? "bg-amber-400"
      : "bg-pink-400";

  const runtimeLabel = runtime === "native"
    ? "Native · WeebCentral"
    : sourceHealth === "reachable"
      ? "PWA/Web · private relay"
      : "PWA/Web · direct";

  const q = query.trim();
  const hasQuery = Boolean(q);
  // Sources without a language tag (WeebCentral) are English.
  const visibleResults = contentLanguage === "all" ? results : results.filter((manga) => (manga.language ?? "en") === contentLanguage);
  const hiddenCount = results.length - visibleResults.length;
  const libraryByKey = useMemo(
    () => new Map(libraryEntries.map((entry) => [`${entry.sourceId}\u0000${entry.mangaId}`, entry])),
    [libraryEntries],
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <PageHeading
        eyebrow={t("browse.kicker")}
        title={t("browse.title")}
        subtitle={status}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[11px] text-zinc-400">
            <span className={`size-1.5 rounded-full ${sourceDot}`} />
            {runtimeLabel}
          </span>
        }
      />

      <div className="mt-6 rounded-2xl border border-white/[.07] bg-[#111019] p-3 sm:p-4">
        <label className="relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true"><SearchIcon /></span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("browse.placeholder")}
            className="field h-13 w-full pl-11 pr-4 text-sm placeholder:text-zinc-600"
            autoComplete="off"
          />
        </label>
        {sourceNotice ? (
          <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[11px] leading-5 ${sourceHealth === "unreachable" ? "border-amber-300/20 bg-amber-300/[.05] text-amber-200/80" : "border-pink-300/15 bg-pink-300/[.04] text-zinc-400"}`}>
            {sourceNotice}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-600">
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">{t("browse.try")} fantasy</span>
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">romance</span>
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">action</span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="pixel-kicker text-[9px] text-pink-400">{t("browse.catalog")}</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-.03em] text-white">{hasQuery ? t("browse.results") : t("browse.idle")}</h2>
        </div>
        {hasQuery && searchState === "done" ? <span className="text-xs text-zinc-500">{visibleResults.length} title{visibleResults.length === 1 ? "" : "s"}</span> : null}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs text-zinc-500">
          {hiddenCount} {t("browse.hidden")} <Link href="/settings" className="text-pink-300 underline-offset-2 hover:underline">{t("browse.change_language")}</Link>
        </p>
      ) : null}

      {visibleResults.length ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visibleResults.map((manga) => {
            const libraryEntry = libraryByKey.get(`${manga.sourceId}\u0000${manga.id}`);
            return (
              <MangaCard
                key={`${manga.sourceId}-${manga.id}`}
                manga={manga}
                href={runtime === "native" && manga.sourceId === "weebcentral" ? `/native/manga/${manga.id}` : undefined}
                inLibrary={Boolean(libraryEntry)}
                progress={libraryEntry?.progress}
                lastChapterRead={libraryEntry?.lastChapterRead}
                readingStatus={libraryEntry?.readingStatus}
              />
            );
          })}
        </div>
      ) : searchState === "searching" && hasQuery ? (
        <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-sm text-zinc-400" role="status" aria-live="polite">
          Searching live sources for “{q}”…
        </div>
      ) : searchState === "done" && hasQuery ? (
        <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-sm text-zinc-400">
          <strong className="text-zinc-200">0 readable titles returned.</strong>
          <span className="ml-2">The current live sources returned no readable matches for “{q}”.</span>
        </div>
      ) : searchState === "error" && hasQuery ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-sm text-amber-100/80 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Live search failed{searchError ? `: ${searchError}` : "."}</span>
          <button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="button-secondary shrink-0 px-3 py-2 text-xs">Retry live search</button>
        </div>
      ) : null}
    </div>
  );
}
