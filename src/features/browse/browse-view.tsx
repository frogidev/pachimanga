"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { PageHeading } from "@/components/page-heading";
import { MOCK_MANGA } from "@/lib/mock-data";
import { isTauriNative, nativeWeebCentralHealth, searchNativeWeebCentral } from "@/lib/native/tauri-bridge";
import type { Manga } from "@/types/models";

const WEB_STATUS = "Search WeebCentral with MangaDex as an automatic fallback.";
const NATIVE_STATUS = "Native shell detected. WeebCentral requests are sent from this device.";

type RuntimeMode = "checking" | "web" | "native";
type NativeHealth = "idle" | "checking" | "reachable" | "unreachable";

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

export function BrowseView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Manga[]>(MOCK_MANGA);
  const [runtime, setRuntime] = useState<RuntimeMode>("checking");
  const [nativeHealth, setNativeHealth] = useState<NativeHealth>("idle");
  const [status, setStatus] = useState(WEB_STATUS);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const native = isTauriNative();
    setRuntime(native ? "native" : "web");
    setStatus(native ? NATIVE_STATUS : WEB_STATUS);

    if (!native) return;
    setNativeHealth("checking");
    setSourceNotice("Native bridge detected · checking direct WeebCentral access from this device…");
    void nativeWeebCentralHealth().then((ok) => {
      if (cancelled) return;
      setNativeHealth(ok ? "reachable" : "unreachable");
      setSourceNotice(
        ok
          ? "Native bridge connected · WeebCentral homepage is reachable from this device."
          : "Native bridge connected · WeebCentral did not accept the direct health request from this device.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (runtime === "checking") return;
    const q = query.trim();
    if (!q) {
      const resetTimer = window.setTimeout(() => {
        setResults(MOCK_MANGA);
        setStatus(runtime === "native" ? NATIVE_STATUS : WEB_STATUS);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus(runtime === "native" ? "Searching WeebCentral from this device…" : "Searching manga sources…");
      if (runtime === "native") setSourceNotice("Native WeebCentral search in progress…");
      let nativeError: string | undefined;

      if (runtime === "native") {
        try {
          const nativeItems = await searchNativeWeebCentral(q);
          if (cancelled) return;
          if (nativeItems.length) {
            setResults(nativeItems);
            setNativeHealth("reachable");
            setSourceNotice(`Using WeebCentral directly from this device · ${nativeItems.length} result${nativeItems.length === 1 ? "" : "s"}.`);
            setStatus(`${nativeItems.length} result${nativeItems.length === 1 ? "" : "s"} from WeebCentral · native device connection`);
            return;
          }
          setSourceNotice("WeebCentral answered the native search but returned no matching titles. Trying MangaDex…");
        } catch (error) {
          nativeError = error instanceof Error ? error.message : "Native WeebCentral unavailable";
          setNativeHealth("unreachable");
          setSourceNotice(`Native WeebCentral failed: ${nativeError} · Trying MangaDex fallback…`);
        }
      }

      try {
        const response = await fetch(`/api/source/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Search failed");
        if (cancelled) return;
        const items = body.items || [];
        setResults(items);
        const source = body.source || "source";
        const fallbackNote = runtime === "native" && nativeError
          ? ` · Native WeebCentral unavailable (${nativeError}); ${source} was used.`
          : body.warning && source === "MangaDex"
            ? " · WeebCentral is unavailable from this host, so MangaDex was used."
            : "";
        if (runtime === "native") {
          setSourceNotice(
            nativeError
              ? `Showing ${source} fallback · native WeebCentral error: ${nativeError}`
              : `Showing ${source} fallback because native WeebCentral returned no matching titles.`,
          );
        }
        setStatus(`${items.length} result${items.length === 1 ? "" : "s"} from ${source}${fallbackNote}`);
      } catch (error) {
        if (!cancelled && (error as Error).name !== "AbortError") {
          const message = error instanceof Error ? error.message : "Search unavailable";
          setStatus(message);
          if (runtime === "native") setSourceNotice(`Search failed: ${message}`);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, runtime]);

  const nativeDot = nativeHealth === "reachable"
    ? "bg-emerald-400"
    : nativeHealth === "unreachable"
      ? "bg-amber-400"
      : "bg-pink-400";

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <PageHeading
        eyebrow="Discover"
        title="Browse manga"
        subtitle={status}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[11px] text-zinc-400">
            <span className={`size-1.5 rounded-full ${runtime === "native" ? nativeDot : "bg-emerald-400"}`} />
            {runtime === "native" ? "Native shell · WeebCentral + MangaDex" : "WeebCentral + MangaDex fallback"}
          </span>
        }
      />

      <div className="mt-6 rounded-2xl border border-white/[.07] bg-[#111019] p-3 sm:p-4">
        <label className="relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true"><SearchIcon /></span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, genre, or keyword"
            className="field h-13 w-full pl-11 pr-4 text-sm placeholder:text-zinc-600"
            autoComplete="off"
          />
        </label>
        {runtime === "native" && sourceNotice ? (
          <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[11px] leading-5 ${nativeHealth === "unreachable" ? "border-amber-300/20 bg-amber-300/[.05] text-amber-200/80" : "border-pink-300/15 bg-pink-300/[.04] text-zinc-400"}`}>
            {sourceNotice}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-600">
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">Try: fantasy</span>
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">romance</span>
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">action</span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="pixel-kicker text-[9px] text-pink-400">Catalog</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-.03em] text-white">{query.trim() ? "Search results" : "Recommended for you"}</h2>
        </div>
        <span className="text-xs text-zinc-500">{results.length} title{results.length === 1 ? "" : "s"}</span>
      </div>

      {results.length ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((manga) => (
            <MangaCard
              key={`${manga.sourceId}-${manga.id}`}
              manga={manga}
              href={runtime === "native" && manga.sourceId === "weebcentral" ? `/native/manga/${manga.id}` : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card mt-6 px-6 py-14 text-center">
          <div className="text-3xl">⌕</div>
          <h3 className="mt-3 font-semibold text-zinc-200">No matching readable manga</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Try a shorter title or remove punctuation. MangaDex fallback results are limited to titles that report available chapters.</p>
        </div>
      )}
    </div>
  );
}
