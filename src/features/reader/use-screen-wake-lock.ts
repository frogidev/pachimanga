"use client";

import { useEffect, useState } from "react";

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void>; addEventListener?: (type: "release", listener: () => void) => void };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

export function useScreenWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false); const [supported, setSupported] = useState(false);
  useEffect(() => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock; setSupported(Boolean(wakeLock));
    if (!enabled || !wakeLock) { setActive(false); return; }
    let sentinel: WakeLockSentinelLike | null = null; let cancelled = false;
    const acquire = async () => { if (cancelled || document.visibilityState !== "visible") return; try { sentinel = await wakeLock.request("screen"); if (cancelled) { await sentinel.release().catch(() => undefined); return; } setActive(true); sentinel.addEventListener?.("release", () => setActive(false)); } catch { if (!cancelled) setActive(false); } };
    const onVisibility = () => { if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire(); };
    void acquire(); document.addEventListener("visibilitychange", onVisibility);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisibility); if (sentinel && !sentinel.released) void sentinel.release().catch(() => undefined); };
  }, [enabled]);
  return { active, supported };
}
