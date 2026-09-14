"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function detectAppleMobile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
}

export function PwaInstall() {
  const [appleMobile, setAppleMobile] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installResult, setInstallResult] = useState<string | null>(null);

  useEffect(() => {
    setAppleMobile(detectAppleMobile());
    setInstalled(isStandalone());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setInstallResult("Pachimanga is installed on this device.");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setInstallResult(choice.outcome === "accepted" ? "Installation accepted." : "Installation cancelled.");
    setPromptEvent(null);
  }

  return (
    <div className="app-page max-w-4xl">
      <div className="rounded-3xl border border-pink-300/15 bg-gradient-to-br from-pink-300/[.08] via-[#111019] to-[#0d0c12] p-6 sm:p-8">
        <p className="pixel-kicker text-[9px] text-pink-400">Free install</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-white sm:text-4xl">Install Pachimanga as a PWA</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          The PWA is the free distribution path for iPhone and iPad. It uses the same account, library, reader and private WeebCentral relay as the web app, without an App Store account.
        </p>

        {installed ? (
          <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-sm text-emerald-200">
            Pachimanga is already running as an installed web app on this device.
          </div>
        ) : promptEvent ? (
          <button type="button" onClick={() => void install()} className="button-primary mt-6 inline-flex px-5 py-3 text-sm">
            Install Pachimanga
          </button>
        ) : null}

        {installResult ? <p className="mt-3 text-xs text-zinc-500">{installResult}</p> : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className={`surface-card p-5 sm:p-6 ${appleMobile ? "ring-1 ring-pink-300/20" : ""}`}>
          <p className="pixel-kicker text-[9px] text-pink-400">iPhone / iPad</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-100">Safari installation</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
            <li><span className="mr-2 font-mono text-pink-300">1.</span>Open <strong className="text-zinc-200">pachimanga.frogilab.dev</strong> in Safari.</li>
            <li><span className="mr-2 font-mono text-pink-300">2.</span>Tap the Share button in Safari.</li>
            <li><span className="mr-2 font-mono text-pink-300">3.</span>Choose <strong className="text-zinc-200">Add to Home Screen</strong>.</li>
            <li><span className="mr-2 font-mono text-pink-300">4.</span>Confirm Add, then launch Pachimanga from the Home Screen.</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-zinc-600">No seven-day signing cycle is involved because this is a web app, not a sideloaded iOS binary.</p>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <p className="pixel-kicker text-[9px] text-sky-400">Android / desktop</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-100">Browser installation</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Chrome, Edge and other compatible browsers can install Pachimanga directly. If the install button is not shown above, use the browser menu and choose Install app or Add to Home Screen.
          </p>
          <div className="mt-5 rounded-xl border border-white/[.07] bg-black/15 px-4 py-3 text-xs leading-5 text-zinc-500">
            Native Android, Windows, Linux and macOS builds remain optional. The PWA is the zero-cost path and receives UI updates automatically from production.
          </div>
        </section>
      </div>

      <section className="surface-card mt-4 p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-emerald-400">WeebCentral</p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-100">Private relay support</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          On the PWA, WeebCentral metadata requests are sent through the private Pachimanga relay when it is configured. Manga page images continue loading directly from their original image hosts, so the relay does not carry the heavy reading bandwidth.
        </p>
      </section>
    </div>
  );
}
