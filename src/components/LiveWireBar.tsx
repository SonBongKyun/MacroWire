"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, BellOff, BellRing, Volume2, VolumeX, Zap } from "lucide-react";

interface LiveWireBarProps {
  pending: number;
  pendingBreaking: number;
  connected: boolean;
  checkedAt: number | null;
  soundOn: boolean;
  notifyOn: boolean;
  onLoad: () => void;
  onToggleSound: () => void;
  onToggleNotify: () => void;
}

/**
 * A short rising two-tone, synthesised rather than shipped.
 *
 * A bundled audio file is another request and another asset to host for
 * something that is two oscillators. It is also created on demand, because a
 * page that builds an AudioContext at load gets one in "suspended" state until
 * the reader interacts with the page anyway.
 */
function playChime(breaking: boolean) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = breaking ? [880, 1174.7] : [660, 880];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.11;
      // Short envelope; a click here would be worse than no sound at all.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(breaking ? 0.14 : 0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });

    setTimeout(() => void ctx.close(), 600);
  } catch {
    /* audio is a nicety, never a failure */
  }
}

export function LiveWireBar({
  pending,
  pendingBreaking,
  connected,
  checkedAt,
  soundOn,
  notifyOn,
  onLoad,
  onToggleSound,
  onToggleNotify,
}: LiveWireBarProps) {
  const announced = useRef(0);

  // Fire the chime and the OS notification once per arrival, not once per
  // render — pending stays elevated until the reader loads the articles.
  useEffect(() => {
    if (pending <= announced.current) {
      if (pending === 0) announced.current = 0;
      return;
    }
    const fresh = pending - announced.current;
    announced.current = pending;

    if (soundOn) playChime(pendingBreaking > 0);

    if (notifyOn && typeof window !== "undefined" && "Notification" in window
        && Notification.permission === "granted") {
      const title = pendingBreaking > 0 ? "속보" : "새 기사";
      new Notification(`MacroWire — ${title}`, {
        body: `${fresh}건이 도착했습니다`,
        icon: "/icon-192.png",
        tag: "macrowire-live",
      });
    }
  }, [pending, pendingBreaking, soundOn, notifyOn]);

  // Put the count in the tab title so it reads at a glance from another tab.
  useEffect(() => {
    const base = "MacroWire";
    document.title = pending > 0 ? `(${pending}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [pending]);

  const stale = checkedAt !== null && Date.now() - checkedAt > 45_000;

  return (
    <div className={`livewire ${pending > 0 ? "has-pending" : ""}`} role="status" aria-live="polite">
      <span className={`livewire-state ${connected && !stale ? "is-live" : "is-down"}`}>
        <span className="livewire-dot" aria-hidden="true" />
        {connected && !stale ? "LIVE" : "연결 끊김"}
      </span>

      {pending > 0 ? (
        <button className="livewire-load" onClick={onLoad}>
          {pendingBreaking > 0 && (
            <span className="livewire-breaking">
              <Zap size={11} aria-hidden="true" /> 속보 {pendingBreaking}
            </span>
          )}
          <span className="livewire-count">새 기사 {pending}건</span>
          <ArrowUp size={13} aria-hidden="true" />
        </button>
      ) : (
        <span className="livewire-idle">수신 중 · 새 기사가 오면 바로 알려드립니다</span>
      )}

      <span className="livewire-spacer" />

      <button
        className={`livewire-toggle ${soundOn ? "is-on" : ""}`}
        onClick={onToggleSound}
        title={soundOn ? "알림음 끄기" : "알림음 켜기"}
        aria-pressed={soundOn}
      >
        {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </button>
      <button
        className={`livewire-toggle ${notifyOn ? "is-on" : ""}`}
        onClick={onToggleNotify}
        title={notifyOn ? "데스크톱 알림 끄기" : "데스크톱 알림 켜기"}
        aria-pressed={notifyOn}
      >
        {notifyOn ? <BellRing size={14} /> : <BellOff size={14} />}
      </button>
    </div>
  );
}
