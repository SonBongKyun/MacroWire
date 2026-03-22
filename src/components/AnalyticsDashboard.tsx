"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/types";
import { computeTagTrends, computeSentimentHeatmap, computeTagBubbles, computeDailyDigest, computeWeeklyReport } from "@/lib/analytics/trends";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";
import { TAG_COLORS } from "@/lib/constants/colors";

interface AnalyticsDashboardProps {
  articles: Article[];
  onSelectArticle?: (article: Article) => void;
  onTagClick?: (tag: string) => void;
}

type Tab = "trends" | "heatmap" | "bubbles" | "digest" | "report" | "calendar";

const ECON_EVENTS = [
  { date: "2026-03-18", title: "FOMC 회의 시작", region: "미국", importance: "high" },
  { date: "2026-03-19", title: "FOMC 금리 결정", region: "미국", importance: "high" },
  { date: "2026-03-13", title: "한은 금통위", region: "한국", importance: "high" },
  { date: "2026-03-10", title: "미국 CPI 발표", region: "미국", importance: "high" },
  { date: "2026-03-07", title: "미국 고용보고서", region: "미국", importance: "high" },
  { date: "2026-03-04", title: "한국 CPI 발표", region: "한국", importance: "medium" },
  { date: "2026-03-05", title: "ECB 금리 결정", region: "유럽", importance: "high" },
  { date: "2026-03-12", title: "미국 PPI 발표", region: "미국", importance: "medium" },
  { date: "2026-03-20", title: "일본은행 금리 결정", region: "일본", importance: "high" },
  { date: "2026-03-25", title: "한국 소비자심리지수", region: "한국", importance: "medium" },
  { date: "2026-03-27", title: "미국 4Q GDP 최종", region: "미국", importance: "medium" },
  { date: "2026-03-28", title: "미국 PCE 물가", region: "미국", importance: "high" },
  { date: "2026-04-02", title: "FOMC 의사록 공개", region: "미국", importance: "medium" },
  { date: "2026-04-10", title: "미국 CPI 발표", region: "미국", importance: "high" },
  { date: "2026-04-16", title: "ECB 금리 결정", region: "유럽", importance: "high" },
];

const REGION_COLORS: Record<string, string> = {
  미국: "#C9A96E",
  한국: "#C9A96E",
  유럽: "#8C8C91",
  일본: "#8C8C91",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export function AnalyticsDashboard({ articles, onSelectArticle, onTagClick }: AnalyticsDashboardProps) {
  const [tab, setTab] = useState<Tab>("trends");

  const trends = useMemo(() => computeTagTrends(articles, 7), [articles]);
  const heatmap = useMemo(() => computeSentimentHeatmap(articles), [articles]);
  const bubbles = useMemo(() => computeTagBubbles(articles), [articles]);
  const digest = useMemo(() => computeDailyDigest(articles), [articles]);
  const report = useMemo(() => computeWeeklyReport(articles), [articles]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "trends", label: "트렌드", icon: "📈" },
    { key: "heatmap", label: "감성맵", icon: "🗺️" },
    { key: "bubbles", label: "버블맵", icon: "🫧" },
    { key: "digest", label: "데일리", icon: "📋" },
    { key: "report", label: "주간", icon: "📊" },
    { key: "calendar", label: "캘린더", icon: "📅" },
  ];

  const topTrendTags = (() => {
    const tagTotals: Record<string, number> = {};
    trends.forEach((p) => Object.entries(p.counts).forEach(([t, c]) => { tagTotals[t] = (tagTotals[t] || 0) + c; }));
    return Object.entries(tagTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  })();

  const heatmapTags = (() => {
    const tagTotals: Record<string, number> = {};
    heatmap.forEach((c) => { tagTotals[c.tag] = (tagTotals[c.tag] || 0) + c.total; });
    return Object.entries(tagTotals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Header tabs */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] glass-header shrink-0">
        <h3 className="text-[13px] font-bold text-[var(--foreground-bright)] mr-4 tracking-[-0.01em]">
          Analytics
        </h3>
        <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-[3px] transition-all ${tab === t.key ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAG TRENDS */}
        {tab === "trends" && (
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[var(--foreground-bright)]">7일 태그 트렌드</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {topTrendTags.map((tag) => (
                <button key={tag} onClick={() => onTagClick?.(tag)} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TAG_COLORS[tag] || "#6b7280" }} />
                  <span className="font-medium text-[var(--foreground)]">{tag}</span>
                </button>
              ))}
            </div>
            <div className="glass-card p-4 rounded-[var(--radius-md)]">
              <div className="flex items-end gap-1 h-40">
                {trends.map((point) => {
                  const maxTotal = Math.max(...trends.map((p) => Object.values(p.counts).reduce((a, b) => a + b, 0)), 1);
                  return (
                    <div key={point.date} className="flex-1 flex flex-col items-center justify-end h-full gap-[1px]">
                      {topTrendTags.map((tag) => {
                        const count = point.counts[tag] || 0;
                        const h = maxTotal > 0 ? (count / maxTotal) * 100 : 0;
                        return (
                          <div
                            key={tag}
                            className="w-full rounded-[2px] transition-all duration-300"
                            style={{ height: `${Math.max(h, count > 0 ? 3 : 0)}%`, backgroundColor: TAG_COLORS[tag] || "#6b7280", opacity: 0.85 }}
                            title={`${tag}: ${count}건`}
                          />
                        );
                      })}
                      <span className="text-[8px] text-[var(--muted)] mt-1 tabular-nums">{point.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="glass-card p-3 rounded-[var(--radius-md)]">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[var(--muted)] text-[9px] uppercase tracking-wider">
                    <th className="text-left pb-2">태그</th>
                    {trends.map((p) => <th key={p.date} className="text-center pb-2 tabular-nums">{p.date.slice(5)}</th>)}
                    <th className="text-right pb-2">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {topTrendTags.map((tag) => {
                    const total = trends.reduce((acc, p) => acc + (p.counts[tag] || 0), 0);
                    return (
                      <tr key={tag} className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
                        <td className="py-1.5 font-semibold" style={{ color: TAG_COLORS[tag] }}>{tag}</td>
                        {trends.map((p) => <td key={p.date} className="text-center tabular-nums text-[var(--foreground-secondary)]">{p.counts[tag] || 0}</td>)}
                        <td className="text-right font-bold tabular-nums">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SENTIMENT HEATMAP */}
        {tab === "heatmap" && (
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[var(--foreground-bright)]">감성 히트맵 (태그 × 시간대)</h4>
            <div className="flex items-center gap-4 text-[9px] text-[var(--muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} /> 긍정</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} /> 부정</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#94a3b8" }} /> 중립</span>
            </div>
            <div className="glass-card p-4 rounded-[var(--radius-md)] overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="flex items-center ml-16">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[8px] text-[var(--muted)] tabular-nums">{h}</div>
                  ))}
                </div>
                {heatmapTags.map((tag) => (
                  <div key={tag} className="flex items-center gap-1 py-0.5">
                    <span className="w-14 text-[10px] font-semibold text-right pr-2 shrink-0" style={{ color: TAG_COLORS[tag] }}>{tag}</span>
                    <div className="flex flex-1 gap-[1px]">
                      {Array.from({ length: 24 }, (_, h) => {
                        const cell = heatmap.find((c) => c.tag === tag && c.hour === h);
                        if (!cell || cell.total === 0) {
                          return <div key={h} className="flex-1 h-5 rounded-[2px] bg-[var(--surface-active)]" />;
                        }
                        const posRatio = cell.positive / cell.total;
                        const negRatio = cell.negative / cell.total;
                        const color = posRatio > negRatio ? `rgba(34,197,94,${0.3 + posRatio * 0.7})` : negRatio > posRatio ? `rgba(239,68,68,${0.3 + negRatio * 0.7})` : `rgba(148,163,184,0.6)`;
                        return (
                          <div
                            key={h}
                            className="flex-1 h-5 rounded-[2px] heatmap-cell cursor-default"
                            style={{ backgroundColor: color }}
                            title={`${tag} ${h}시: 긍정${cell.positive} 부정${cell.negative} 중립${cell.neutral}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAG BUBBLES */}
        {tab === "bubbles" && (
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[var(--foreground-bright)]">태그 버블 맵</h4>
            <p className="text-[10px] text-[var(--muted)]">크기 = 기사 수, 색상 = 태그 색상, 테두리 = 감성 (초록=긍정, 빨강=부정)</p>
            <div className="glass-card p-6 rounded-[var(--radius-md)] flex flex-wrap gap-3 justify-center items-center min-h-[300px]">
              {bubbles.map((b) => {
                const maxCount = Math.max(...bubbles.map((x) => x.count), 1);
                const size = 40 + (b.count / maxCount) * 100;
                const sentColor = b.positive > b.negative ? "#22c55e" : b.negative > b.positive ? "#ef4444" : "#94a3b8";
                return (
                  <button
                    key={b.tag}
                    onClick={() => onTagClick?.(b.tag)}
                    className="bubble-tag rounded-full flex flex-col items-center justify-center"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: `${b.color}20`,
                      border: `2px solid ${sentColor}`,
                    }}
                    title={`${b.tag}: ${b.count}건 (긍정${b.positive} 부정${b.negative} 중립${b.neutral})`}
                  >
                    <span className="text-[11px] font-bold" style={{ color: b.color }}>{b.tag}</span>
                    <span className="text-[9px] font-semibold tabular-nums" style={{ color: sentColor }}>{b.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* DAILY DIGEST */}
        {tab === "digest" && (
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[var(--foreground-bright)]">오늘의 데일리 다이제스트</h4>
            <div className="glass-card p-4 rounded-[var(--radius-md)] border-l-[3px] border-l-[var(--accent)]">
              <p className="text-[12px] leading-[1.8] text-[var(--foreground)]">{digest.summary}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[20px] font-extrabold text-[#22c55e] tabular-nums">{digest.sentimentOverview.positive}</div>
                <div className="text-[10px] text-[var(--muted)]">긍정</div>
              </div>
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[20px] font-extrabold text-[#ef4444] tabular-nums">{digest.sentimentOverview.negative}</div>
                <div className="text-[10px] text-[var(--muted)]">부정</div>
              </div>
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[20px] font-extrabold text-[#94a3b8] tabular-nums">{digest.sentimentOverview.neutral}</div>
                <div className="text-[10px] text-[var(--muted)]">중립</div>
              </div>
            </div>
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-2">주요 태그 Top 5</h5>
              <div className="flex gap-2">
                {digest.topTags.map(([tag, count]) => (
                  <button key={tag} onClick={() => onTagClick?.(tag)} className="glass-card px-3 py-2 rounded-[var(--radius-md)] flex items-center gap-2 hover:bg-[var(--surface-hover)]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TAG_COLORS[tag] || "#6b7280" }} />
                    <span className="text-[11px] font-semibold" style={{ color: TAG_COLORS[tag] }}>{tag}</span>
                    <span className="text-[10px] text-[var(--muted)] tabular-nums">{count}건</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-2">주요 기사</h5>
              <div className="space-y-1">
                {digest.keyArticles.map((a) => (
                  <button key={a.id} onClick={() => onSelectArticle?.(a)} className="w-full text-left p-2.5 rounded-[var(--radius-sm)] glass-card hover:bg-[var(--surface-hover)] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: analyzeSentiment(a.title, a.summary).color }} />
                      <p className="text-[11px] font-medium text-[var(--foreground)] line-clamp-1 flex-1">{a.title}</p>
                      <span className="text-[9px] text-[var(--muted)] shrink-0">{timeAgo(a.publishedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WEEKLY REPORT */}
        {tab === "report" && (
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[var(--foreground-bright)]">주간 리포트</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[20px] font-extrabold text-[var(--accent)] tabular-nums">{report.totalArticles}</div>
                <div className="text-[10px] text-[var(--muted)]">이번 주 기사</div>
              </div>
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[20px] font-extrabold text-[#22c55e] tabular-nums">{report.sentimentTrend.positive}</div>
                <div className="text-[10px] text-[var(--muted)]">긍정</div>
              </div>
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[20px] font-extrabold text-[#ef4444] tabular-nums">{report.sentimentTrend.negative}</div>
                <div className="text-[10px] text-[var(--muted)]">부정</div>
              </div>
              <div className="glass-card p-3 rounded-[var(--radius-md)] text-center">
                <div className="text-[14px] font-bold text-[var(--foreground-bright)] tabular-nums">{report.busiestDay ? new Date(report.busiestDay).toLocaleDateString("ko-KR", { weekday: "short", month: "short", day: "numeric" }) : "-"}</div>
                <div className="text-[10px] text-[var(--muted)]">가장 바쁜 날</div>
              </div>
            </div>
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-2">태그별 변화</h5>
              <div className="glass-card p-3 rounded-[var(--radius-md)] space-y-2">
                {report.tagTrends.slice(0, 8).map((t) => (
                  <div key={t.tag} className="flex items-center gap-2">
                    <span className="w-12 text-[11px] font-semibold text-right" style={{ color: TAG_COLORS[t.tag] }}>{t.tag}</span>
                    <div className="flex-1 h-4 bg-[var(--surface-active)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min((t.count / Math.max(report.totalArticles, 1)) * 100, 100)}%`, backgroundColor: TAG_COLORS[t.tag] || "var(--accent)", opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-[var(--foreground)] font-medium w-8 text-right">{t.count}</span>
                    <span className={`text-[9px] font-bold tabular-nums w-10 text-right ${t.change > 0 ? "text-[#22c55e]" : t.change < 0 ? "text-[#ef4444]" : "text-[var(--muted)]"}`}>
                      {t.change > 0 ? `+${t.change}` : t.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-2">주요 기사</h5>
              <div className="space-y-1">
                {report.topArticles.map((a) => (
                  <button key={a.id} onClick={() => onSelectArticle?.(a)} className="w-full text-left p-2 glass-card rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)]">
                    <p className="text-[11px] font-medium line-clamp-1 text-[var(--foreground)]">{a.title}</p>
                    <span className="text-[9px] text-[var(--muted)]">{a.sourceName} · {timeAgo(a.publishedAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ECONOMIC CALENDAR */}
        {tab === "calendar" && (
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[var(--foreground-bright)]">경제 캘린더</h4>
            <p className="text-[10px] text-[var(--muted)]">주요 경제 일정 및 관련 기사 매칭</p>
            <div className="space-y-2">
              {ECON_EVENTS
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((ev, i) => {
                  const d = new Date(ev.date);
                  const isPast = d.getTime() < Date.now();
                  const isToday = ev.date === new Date().toISOString().slice(0, 10);
                  const relatedCount = articles.filter((a) => {
                    const diff = Math.abs(new Date(a.publishedAt).getTime() - d.getTime());
                    return diff < 2 * 24 * 60 * 60 * 1000 && (
                      a.tags.includes(ev.region) || a.title.includes(ev.title.split(" ")[0])
                    );
                  }).length;

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] glass-card transition-colors ${isToday ? "border-l-[3px] border-l-[var(--accent)]" : ""} ${isPast ? "opacity-60" : ""}`}
                    >
                      <div className="text-center shrink-0 w-12">
                        <div className="text-[9px] text-[var(--muted)] uppercase">{d.toLocaleDateString("ko-KR", { month: "short" })}</div>
                        <div className="text-[16px] font-extrabold text-[var(--foreground-bright)] tabular-nums">{d.getDate()}</div>
                        <div className="text-[8px] text-[var(--muted)]">{d.toLocaleDateString("ko-KR", { weekday: "short" })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[var(--foreground-bright)]">{ev.title}</span>
                          {isToday && <span className="text-[8px] font-bold text-[var(--accent)] px-1.5 py-0.5 rounded-full bg-[var(--accent-surface)]">TODAY</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: REGION_COLORS[ev.region] || "#6b7280", backgroundColor: `${REGION_COLORS[ev.region] || "#6b7280"}15` }}>{ev.region}</span>
                          <span className={`text-[8px] font-bold uppercase tracking-wider ${ev.importance === "high" ? "text-[#ef4444]" : "text-[var(--muted)]"}`}>{ev.importance === "high" ? "HIGH" : "MED"}</span>
                        </div>
                      </div>
                      {relatedCount > 0 && (
                        <span className="text-[9px] font-semibold text-[var(--accent)] tabular-nums px-2 py-1 rounded-full bg-[var(--accent-surface)]">
                          {relatedCount}건 기사
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
