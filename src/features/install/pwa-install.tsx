"use client";

import { useEffect, useState } from "react";
import { isAppleMobileDevice, isInstalledPwa } from "@/lib/pwa/display-mode";
import { useLocale } from "@/lib/i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function initialAppleMobile() {
  return isAppleMobileDevice();
}

function initialInstalled() {
  return isInstalledPwa();
}

export function PwaInstall() {
  const { t } = useLocale();
  const [appleMobile] = useState(initialAppleMobile);
  const [installed, setInstalled] = useState(initialInstalled);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installResult, setInstallResult] = useState<string | null>(null);

  useEffect(() => {
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
    setInstallResult(choice.outcome === "accepted" ? t("install.accepted") : t("install.cancelled"));
    setPromptEvent(null);
  }

  return (
    <div className="app-page max-w-4xl">
      <div className="rounded-3xl border border-pink-300/15 bg-gradient-to-br from-pink-300/[.08] via-[#111019] to-[#0d0c12] p-6 sm:p-8">
        <p className="pixel-kicker text-[9px] text-pink-400">{t("install.kicker")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-white sm:text-4xl">{installed ? t("install.installed_title") : t("install.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          {installed
            ? t("install.installed_sub")
            : t("install.sub")}
        </p>

        {installed ? (
          <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-sm text-emerald-200">
            {t("install.standalone")}
          </div>
        ) : promptEvent ? (
          <button type="button" onClick={() => void install()} className="button-primary mt-6 inline-flex px-5 py-3 text-sm">
            {t("install.button")}
          </button>
        ) : null}

        <p className="mt-3 min-h-5 text-xs text-zinc-500" role="status" aria-live="polite">{installResult || ""}</p>
      </div>

      {!installed ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className={`surface-card p-5 sm:p-6 ${appleMobile ? "ring-1 ring-pink-300/20" : ""}`}>
            <p className="pixel-kicker text-[9px] text-pink-400">{t("install.ios_kicker")}</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-100">{t("install.ios_title")}</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
              <li><span className="mr-2 font-mono text-pink-300">1.</span>{t("install.ios.1_a")} <strong className="text-zinc-200">pachimanga.frogilab.dev</strong> {t("install.ios.1_b")}</li>
              <li><span className="mr-2 font-mono text-pink-300">2.</span>{t("install.ios.2")}</li>
              <li><span className="mr-2 font-mono text-pink-300">3.</span>{t("install.ios.3_a")} <strong className="text-zinc-200">{t("install.ios.3_b")}</strong>.</li>
              <li><span className="mr-2 font-mono text-pink-300">4.</span>{t("install.ios.4")}</li>
            </ol>
            <p className="mt-4 text-xs leading-5 text-zinc-600">{t("install.ios_note")}</p>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <p className="pixel-kicker text-[9px] text-sky-400">{t("install.android_kicker")}</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-100">{t("install.browser_title")}</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {t("install.browser_sub")}
            </p>
            <div className="mt-5 rounded-xl border border-white/[.07] bg-black/15 px-4 py-3 text-xs leading-5 text-zinc-500">
              {t("install.native_note")}
            </div>
          </section>
        </div>
      ) : (
        <section className="surface-card mt-5 p-5 sm:p-6">
          <p className="pixel-kicker text-[9px] text-sky-400">{t("install.update_kicker")}</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-100">{t("install.update_title")}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{t("install.update_sub")}</p>
        </section>
      )}

      <section className="surface-card mt-4 p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-emerald-400">{t("install.relay_kicker")}</p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-100">{t("install.relay_title")}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {t("install.relay_sub")}
        </p>
      </section>
    </div>
  );
}
