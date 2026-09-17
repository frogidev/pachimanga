"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearChapterCache, getOfflineStorageEstimate } from "@/lib/offline/chapter-cache";
import { isInstalledPwa } from "@/lib/pwa/display-mode";

type StorageState = { usage: number; quota: number } | null;

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount >= 10 || unit === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[unit]}`;
}

export function PwaDeviceStatus() {
  const [standalone, setStandalone] = useState(false);
  const [storage, setStorage] = useState<StorageState>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const refreshInstallState = () => setStandalone(isInstalledPwa());
    const refreshStorage = () => void getOfflineStorageEstimate().then(setStorage);
    refreshInstallState();
    refreshStorage();
    media.addEventListener?.("change", refreshInstallState);
    window.addEventListener("appinstalled", refreshInstallState);
    window.addEventListener("pachimanga:offline-cache-change", refreshStorage);
    return () => {
      media.removeEventListener?.("change", refreshInstallState);
      window.removeEventListener("appinstalled", refreshInstallState);
      window.removeEventListener("pachimanga:offline-cache-change", refreshStorage);
    };
  }, []);

  async function clearDownloads() {
    if (clearing) return;
    setClearing(true);
    try {
      await clearChapterCache();
      setStorage(await getOfflineStorageEstimate());
      window.dispatchEvent(new CustomEvent("pachimanga:offline-cache-change"));
    } finally {
      setClearing(false);
    }
  }

  const storageCopy = storage
    ? `${formatBytes(storage.usage)} used of ${formatBytes(storage.quota)} available to this site.`
    : "Storage usage is unavailable in this browser.";

  return (
    <section className="rounded-2xl border border-pink-300/15 bg-pink-300/[.045] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-10 place-items-center rounded-xl bg-pink-400/10 text-pink-300">PWA</div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${standalone ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[.05] text-zinc-400"}`}>
          {standalone ? "Installed" : "Browser"}
        </span>
      </div>
      <h2 className="mt-4 font-semibold text-zinc-100">Installed app & offline pages</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {standalone
          ? "Pachimanga is running in standalone mode. App updates are announced before reload so an active reading session is not replaced silently."
          : "Install Pachimanga from your browser for a standalone app window. Your account is still required after installation."}
      </p>
      <p className="mt-3 text-xs leading-5 text-zinc-600">{storageCopy}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {!standalone ? <Link href="/install" className="button-primary inline-flex px-4 py-2.5 text-sm">Installation guide</Link> : null}
        <button type="button" onClick={() => void clearDownloads()} disabled={clearing} className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50">
          {clearing ? "Clearing…" : "Clear offline chapter pages"}
        </button>
      </div>
    </section>
  );
}
