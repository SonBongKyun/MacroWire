"use client";

import { useEffect, useRef } from "react";

interface Options {
  /**
   * Fire once the moment the tab becomes visible again, so a phone coming out
   * of a pocket shows current data instead of waiting out the interval.
   * Defaults to true; turn it off for cosmetic timers like a countdown.
   */
  runOnResume?: boolean;
}

/**
 * setInterval that only runs while the tab is visible.
 *
 * A wire app gets left open. On a phone that meant the news poll (30s), three
 * market polls (5m each) and a pair of one-second clocks kept firing in the
 * background — radio wakeups and data for pixels nobody was looking at.
 * Everything on a timer here goes through this hook instead.
 */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number,
  { runOnResume = true }: Options = {}
) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!delayMs || delayMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let wasHidden = document.visibilityState !== "visible";

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const sync = () => {
      if (document.visibilityState === "visible") {
        // Only catch up after an actual hidden stretch — not on mount, where
        // callers already do their own initial fetch.
        if (wasHidden && runOnResume) saved.current();
        wasHidden = false;
        if (timer === null) timer = setInterval(() => saved.current(), delayMs);
      } else {
        wasHidden = true;
        stop();
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [delayMs, runOnResume]);
}
