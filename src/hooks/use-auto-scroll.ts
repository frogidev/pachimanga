"use client";

import { useEffect, useRef } from "react";
import { calculateScrollDelta, clampElapsedMs } from "@/features/reader/auto-scroll";

export function useAutoScroll({
  playing,
  speedPxPerSecond,
  onEnd,
}: {
  playing: boolean;
  speedPxPerSecond: number;
  onEnd: () => void;
}) {
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!playing || speedPxPerSecond <= 0) return;

    let animationFrame = 0;
    let lastFrame = performance.now();

    const tick = (now: number) => {
      if (document.hidden) {
        lastFrame = now;
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      const elapsedMs = clampElapsedMs(now - lastFrame);
      lastFrame = now;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const remaining = maxScroll - window.scrollY;

      if (remaining <= 1) {
        onEndRef.current();
        return;
      }

      const delta = calculateScrollDelta(speedPxPerSecond, elapsedMs);
      window.scrollBy({ top: Math.min(delta, remaining), behavior: "instant" });
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing, speedPxPerSecond]);
}
