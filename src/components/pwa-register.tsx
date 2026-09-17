"use client";

import { useEffect, useRef, useState } from "react";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const refreshing = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let active = true;
    const onControllerChange = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (!active) return;

        const revealWaitingWorker = () => {
          if (active && registration.waiting && navigator.serviceWorker.controller) {
            setWaitingWorker(registration.waiting);
            setDismissed(false);
          }
        };

        revealWaitingWorker();
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") revealWaitingWorker();
          });
        });

        return registration.update();
      })
      .catch(() => {
        // The app remains fully usable online when service worker registration fails.
      });

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (!waitingWorker || dismissed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissed, waitingWorker]);

  if (!waitingWorker || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-lg rounded-2xl border border-sky-300/20 bg-[#12111a] p-4 shadow-[0_20px_70px_rgba(0,0,0,.5)] md:bottom-5 md:left-auto md:right-5 md:mx-0 md:w-[360px]" role="status" aria-live="polite" aria-label="PWA update available">
      <p className="pixel-kicker text-[9px] text-sky-300">PWA update</p>
      <div className="mt-1 font-semibold text-zinc-100">A new Pachimanga version is ready</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">Reload when convenient. The current version stays active until you choose to update. Press Escape to dismiss this notice.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="button-primary px-4 py-2 text-xs"
          onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
        >
          Update & reload
        </button>
        <button type="button" className="button-secondary px-4 py-2 text-xs" onClick={() => setDismissed(true)}>
          Later
        </button>
      </div>
    </div>
  );
}
