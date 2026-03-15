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
    { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>, label: "오늘 기사", value: animToday, color: "var(--accent)", showSpark: true },
    { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V5a2 2 0 012-2h4l2 3h8a2 2 0 012 2v3M3 21l6-6m0 0l4 4m-4-4v6" /><path strokeLinecap="round" d="M14 3v4h4" /></svg>, label: "미국 관련", value: animUS, color: "#3b82f6", showSpark: false },
    { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, label: "금리 관련", value: animRate, color: "#f59e0b", showSpark: false },
    { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>, label: "환율 관련", value: animFX, color: "#10b981", showSpark: false },
  ];

  const barColors = ["var(--accent)", "#3b82f6", "#10b981"];

  return (
    <aside className="w-[440px] shrink-0 bg-[var(--surface-flat)] border-l border-[var(--border)] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[13px] font-extrabold text-[var(--foreground-bright)] tracking-tight">
              Today Pulse
            </h2>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              오늘의 매크로 동향 한눈에
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono font-bold tabular-nums text-[var(--accent)]">{clock}</span>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] stat-dot-live" />
              <span className="text-[8px] text-[var(--success)] font-bold tracking-widest">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-3.5 rounded-[var(--radius-md)] glass-card glass-card-prism hover-lift relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="leading-none" style={{ color: s.color }}>{s.icon}</span>
                <span className="text-[10px] text-[var(--muted)] font-medium">
                  {s.label}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div
                  className="text-[24px] font-extrabold tabular-nums leading-none counter-value"
                  style={{ color: s.color }}
                >
                  {s.value}
                </div>
                {s.showSpark && sparkData.length > 1 && (
                  <Sparkline data={sparkData} color={typeof s.color === 'string' && s.color.startsWith('#') ? s.color : '#6366f1'} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent 1h highlight */}
        <div className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] glass-card border-l-[3px] border-l-[var(--accent)]">
          <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div className="flex-1">
            <span className="text-[10px] text-[var(--muted)] font-medium">
              최근 1시간
            </span>
            <div className="text-[20px] font-extrabold tabular-nums text-[var(--accent)] leading-tight counter-value">
              {animRecent}<span className="text-[13px] font-bold ml-0.5">건</span>
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] stat-dot-live" />
          <span className="text-[9px] text-[var(--success)] font-bold tracking-wide">
            LIVE
          </span>
        </div>

        {/* 24h Activity Chart */}
        {pulse.hourlyDistribution && (
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-2">
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
            <h3 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-3">
              인기 태그 Top 3
            </h3>
            <div className="space-y-2.5">
              {pulse.topTags.map(([tag, count], i) => {
                const pct =
                  pulse.todayCount > 0
                    ? Math.round((count / pulse.todayCount) * 100)
                    : 0;
                return (
                  <div key={tag} className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums text-white"
                      style={{ backgroundColor: barColors[i] || "var(--accent)" }}
                    >
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
