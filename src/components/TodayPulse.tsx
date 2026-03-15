"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import type { Article } from "@/types";
import { computePulse } from "@/lib/analytics/pulse";

interface TodayPulseProps {
  articles: Article[];
}

/* Animated counter hook */
function useAnimatedValue(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(start + diff * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

/* Mini sparkline component */
function Sparkline({ data, color, width = 64, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * height * 0.85 - 2,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, "")}`;
  
  return (
    <svg width={width} height={height} className="overflow-visible opacity-60">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </svg>
  );
}

/* Live clock */
function useClock(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function TodayPulse({ articles }: TodayPulseProps) {
  const pulse = useMemo(() => computePulse(articles), [articles]);
  const clock = useClock();

  const animToday = useAnimatedValue(pulse.todayCount);
  const animUS = useAnimatedValue(pulse.usCount);
  const animRate = useAnimatedValue(pulse.rateCount);
  const animFX = useAnimatedValue(pulse.fxCount);
  const animRecent = useAnimatedValue(pulse.recentHourCount);

  // Build sparkline data from hourly distribution (last 12 hours relative to now)
  const sparkData = useMemo(() => {
    const now = new Date().getHours();
    const last12 = [];
    for (let i = 11; i >= 0; i--) {
      const h = (now - i + 24) % 24;
      last12.push(pulse.hourlyDistribution?.[h]?.count ?? 0);
    }
    return last12;
  }, [pulse.hourlyDistribution]);

  const stats = [
    { label: "오늘 기사", value: animToday, showSpark: true },
    { label: "미국 관련", value: animUS, showSpark: false },
    { label: "금리 관련", value: animRate, showSpark: false },
    { label: "환율 관련", value: animFX, showSpark: false },
  ];

  const barColors = ["var(--foreground-secondary)", "var(--muted-bright)", "var(--muted)"];

  return (
    <aside className="w-[440px] shrink-0 bg-[var(--surface-flat)] border-l border-[var(--border)] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-[var(--foreground-bright)]">
            오늘의 동향
          </h2>
          <span className="text-[10px] tabular-nums text-[var(--muted)]">{clock}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-[var(--radius-md)] glass-card"
            >
              <span className="text-[10px] text-[var(--muted)] block mb-1">
                {s.label}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-[22px] font-bold tabular-nums leading-none text-[var(--foreground-bright)]">
                  {s.value}
                </span>
                {s.showSpark && sparkData.length > 1 && (
                  <Sparkline data={sparkData} color="var(--border-strong)" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent 1h highlight */}
        <div className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] glass-card">
          <div className="flex-1">
            <span className="text-[10px] text-[var(--muted)]">
              최근 1시간
            </span>
            <div className="text-[18px] font-bold tabular-nums text-[var(--foreground-bright)] leading-tight">
              {animRecent}<span className="text-[12px] font-medium text-[var(--muted)] ml-0.5">건</span>
            </div>
          </div>
        </div>

        {/* 24h Activity Chart */}
        {pulse.hourlyDistribution && (
          <div>
            <h3 className="text-[10px] text-[var(--muted)] font-medium mb-2">
              24시간 활동
            </h3>
            <div className="p-3 rounded-[var(--radius-md)] glass-card">
              <div className="flex items-end gap-[3px] h-16">
                {pulse.hourlyDistribution.map((bucket) => {
                  const maxCount = Math.max(
                    ...pulse.hourlyDistribution.map((h) => h.count),
                    1
                  );
                  const heightPct = (bucket.count / maxCount) * 100;
                  const isNow = bucket.hour === new Date().getHours();
                  return (
                    <div
                      key={bucket.hour}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                    >
                      <div
                        className={`chart-bar w-full rounded-sm ${
                          isNow
                            ? "bg-[var(--accent)]"
                            : bucket.count > 0
                              ? "bg-[var(--accent)]/40"
                              : "bg-[var(--surface-active)]"
                        }`}
                        data-tooltip={`${bucket.hour}시: ${bucket.count}건`}
                        style={{
                          height: `${bucket.count > 0 ? Math.max(heightPct, 8) : 3}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[8px] text-[var(--muted)]">0시</span>
                <span className="text-[8px] text-[var(--muted)]">6시</span>
                <span className="text-[8px] text-[var(--muted)]">12시</span>
                <span className="text-[8px] text-[var(--muted)]">18시</span>
                <span className="text-[8px] text-[var(--muted)]">24시</span>
              </div>
            </div>
          </div>
        )}

        {/* Top tags */}
        {pulse.topTags.length > 0 && (
          <div>
            <h3 className="text-[10px] text-[var(--muted)] font-medium mb-3">
              인기 태그
            </h3>
            <div className="space-y-2.5">
              {pulse.topTags.map(([tag, count], i) => {
                const pct =
                  pulse.todayCount > 0
                    ? Math.round((count / pulse.todayCount) * 100)
                    : 0;
                return (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--muted)] tabular-nums w-3 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-[var(--foreground)]">
                          {tag}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] tabular-nums font-medium">
                          {count}건
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--surface-active)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(pct, 8)}%`,
                            backgroundColor: barColors[i] || "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-[var(--muted)]">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick help */}
        <div className="mt-4 p-3 rounded-[var(--radius-md)] glass-card">
          <h4 className="text-[10px] font-semibold text-[var(--foreground-secondary)] mb-2 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
            </svg>
            빠른 탐색
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              { key: "j / k", desc: "기사 이동" },
              { key: "s", desc: "저장 토글" },
              { key: "o", desc: "원문 열기" },
              { key: "/", desc: "검색" },
              { key: "r", desc: "읽음 토글" },
              { key: "?", desc: "전체 단축키" },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-1.5 py-0.5">
                <kbd className="kbd-key text-[var(--foreground-secondary)] bg-[var(--surface-active)] border border-[var(--border)]">
                  {key}
                </kbd>
                <span className="text-[10px] text-[var(--muted)]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
