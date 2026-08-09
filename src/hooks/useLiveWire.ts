"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

/** How often the open app asks the server to refresh the breaking queue. */
const PULSE_INTERVAL_MS = 60_000;
/** How often it asks whether anything landed. Cheap enough to run this often. */
const CHECK_INTERVAL_MS = 8_000;

export interface LiveWireState {
  /** Articles that arrived since the reader last caught up. */
  pending: number;
  /** How many of those came off a breaking source. */
  pendingBreaking: number;
  /** Last time the server reported an article arriving, ISO. */
  latestAt: string | null;
  /** Wall-clock of the last successful check, for the "live" indicator. */
  checkedAt: number | null;
  /** False once a check fails, so the UI can stop claiming to be live. */
  connected: boolean;
}

interface Options {
  /** Called when new articles are waiting, to pull the list. */
  onArrival: (count: number, breakingCount: number) => void;
  /** Turn the whole thing off (e.g. while an ingest the user triggered runs). */
  paused?: boolean;
}

/**
 * Keeps the wire live for as long as the app is open.
 *
 * Two loops, because they cost very different amounts. The pulse asks the
 * server to go and fetch the breaking feeds — real work, once a minute. The
 * check asks whether anything landed — two counts, every eight seconds. Neither
 * runs while the tab is hidden.
 *
 * The scheduled job cannot do this on its own: GitHub throttles cron on public
 * repositories so hard that a five-minute schedule was landing 45–80 minutes
 * apart. This is what makes "leave it open and watch" actually work.
 */
export function useLiveWire({ onArrival, paused = false }: Options): LiveWireState & {
  /** Move the watermark to now; the reader has caught up. */
  acknowledge: () => void;
} {
  const [state, setState] = useState<LiveWireState>({
    pending: 0,
    pendingBreaking: 0,
    latestAt: null,
    checkedAt: null,
    connected: true,
  });

  // The watermark the reader has already seen. Set on the first check so an
  // existing backlog is not announced as breaking news.
  const sinceRef = useRef<string | null>(null);
  const onArrivalRef = useRef(onArrival);
  useEffect(() => {
    onArrivalRef.current = onArrival;
  }, [onArrival]);

  const check = useCallback(async () => {
    if (paused) return;
    try {
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      const res = await fetch(`/api/articles/head${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: { latest: string | null; newCount: number; breakingCount: number } =
        await res.json();

      // First check only establishes the watermark.
      if (sinceRef.current === null) {
        sinceRef.current = data.latest ?? new Date().toISOString();
        setState((s) => ({
          ...s,
          latestAt: data.latest,
          checkedAt: Date.now(),
          connected: true,
        }));
        return;
      }

      setState((s) => {
        if (data.newCount > s.pending) {
          onArrivalRef.current(data.newCount, data.breakingCount);
        }
        return {
          pending: data.newCount,
          pendingBreaking: data.breakingCount,
          latestAt: data.latest,
          checkedAt: Date.now(),
          connected: true,
        };
      });
    } catch {
      setState((s) => ({ ...s, connected: false }));
    }
  }, [paused]);

  const pulse = useCallback(async () => {
    if (paused) return;
    try {
      await fetch("/api/live/pulse", { method: "POST" });
    } catch {
      /* the scheduled job is still the floor */
    }
    // Look right after asking, so a pulse that found something shows up now
    // rather than on the next eight-second tick.
    await check();
  }, [paused, check]);

  // Kick both loops immediately on mount rather than waiting out an interval.
  useEffect(() => {
    void pulse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useVisibleInterval(pulse, PULSE_INTERVAL_MS);
  useVisibleInterval(check, CHECK_INTERVAL_MS, { runOnResume: false });

  const acknowledge = useCallback(() => {
    sinceRef.current = new Date().toISOString();
    setState((s) => ({ ...s, pending: 0, pendingBreaking: 0 }));
  }, []);

  return { ...state, acknowledge };
}
