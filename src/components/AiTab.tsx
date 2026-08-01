"use client";

import { useMemo } from "react";
import type { Article, Source } from "@/types";
import type { PortfolioPrice } from "@/hooks/usePortfolio";
import { generateSmartSummary, type SmartSummary } from "@/lib/ai/summarizer";
import { generateInsights, type MarketInsight } from "@/lib/ai/insights";
import { getRecommendations, type Recommendation } from "@/lib/ai/recommendations";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment/sentiment";

interface AiTabProps {
  articles: Article[];
  sources: Source[];
  onSelectArticle: (article: Article) => void;
  onTabChange: (tab: string) => void;
  portfolioPrices: PortfolioPrice[];
}

/* ── helpers ── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

const INSIGHT_COLORS: Record<string, string> = {
  trend: "var(--accent)",
  risk: "var(--danger)",
  opportunity: "#3b82f6",
  alert: "#f97316",
};

const INSIGHT_LABELS: Record<string, string> = {
  trend: "TREND",
  risk: "RISK",
  opportunity: "OPPORTUNITY",
  alert: "ALERT",
};

const REC_LABELS: Record<string, string> = {
  trending: "TREND",
  personalized: "READ NEXT",
  breaking: "BREAKING",
  "deep-dive": "DEEP DIVE",
};

/* ── confidence bar ── */
function ConfidenceBar({ value }: { value: number }) {
  return (
    <div style={{ width: 60, height: 3, background: "var(--border)", position: "relative" }}>
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: value > 70 ? "var(--accent)" : "var(--muted)",
        }}
      />
    </div>
  );
}

/* ── section separator ── */
function SectionSep() {
  return <div style={{ borderTop: "1px solid var(--border)", margin: "20px 0" }} />;
}

export function AiTab({ articles, sources, onSelectArticle, onTabChange, portfolioPrices }: AiTabProps) {
  /* ── Precompute summaries ── */
  const summaries = useMemo(() => {
    const map = new Map<string, SmartSummary>();
    for (const a of articles) {
      map.set(a.id, generateSmartSummary(a));
    }
    return map;
  }, [articles]);

  /* ── Sentiment analysis for all articles ── */
  const sentimentData = useMemo(() => {
    const results: { article: Article; result: SentimentResult }[] = [];
    for (const a of articles) {
      results.push({ article: a, result: analyzeSentiment(a.title, a.summary) });
    }
    return results;
  }, [articles]);

  /* ── Market Brief ── */
  const marketBrief = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayArticles = articles.filter(
      (a) => new Date(a.publishedAt).getTime() >= today.getTime()
    );

    let pos = 0, neg = 0, neu = 0;
    for (const a of todayArticles) {
      const s = summaries.get(a.id);
      if (!s) continue;
      if (s.sentiment === "positive") pos++;
      else if (s.sentiment === "negative") neg++;
      else neu++;
    }

    const breakingCount = todayArticles.filter((a) => {
      const s = summaries.get(a.id);
      return s?.impactLevel === "high";
    }).length;

    // Top tags by frequency
    const tagCount: Record<string, number> = {};
    for (const a of todayArticles) {
      for (const t of a.tags) {
        tagCount[t] = (tagCount[t] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    let mood: string;
    let moodColor: string;
    if (pos > neg * 1.5) { mood = "긍정"; moodColor = "var(--success)"; }
    else if (neg > pos * 1.5) { mood = "부정"; moodColor = "var(--danger)"; }
    else { mood = "혼조"; moodColor = "var(--accent)"; }

    return { todayCount: todayArticles.length, pos, neg, neu, breakingCount, topTags, mood, moodColor };
  }, [articles, summaries]);

  /* ── Insights ── */
  const insights = useMemo(() => generateInsights(articles), [articles]);

  /* ── Recommendations ── */
  const recommendations = useMemo(() => {
    const readIds = articles.filter((a) => a.isRead).map((a) => a.id);
    const savedIds = articles.filter((a) => a.isSaved).map((a) => a.id);
    return getRecommendations(articles, readIds, savedIds, 10);
  }, [articles]);

  /* ── Sentiment bar ── */
  const sentimentBar = useMemo(() => {
    let pos = 0, neg = 0, neu = 0;
    for (const { result } of sentimentData) {
      if (result.sentiment === "positive") pos++;
      else if (result.sentiment === "negative") neg++;
      else neu++;
    }
    const total = pos + neg + neu || 1;
    const topPositive = sentimentData
      .filter((d) => d.result.sentiment === "positive")
      .slice(0, 5);
    const topNegative = sentimentData
      .filter((d) => d.result.sentiment === "negative")
      .slice(0, 5);
    return { pos, neg, neu, total, topPositive, topNegative };
  }, [sentimentData]);

  /* ── Entity tracker ── */
  const entityTracker = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const [, s] of summaries) {
      for (const e of s.keyEntities) {
        freq[e] = (freq[e] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [summaries]);

  const maxEntityFreq = entityTracker.length > 0 ? entityTracker[0][1] : 1;

  /* ── Topic network (tag co-occurrence) ── */
  const topicNetwork = useMemo(() => {
    const pairCount: Record<string, number> = {};
    for (const a of articles) {
      const tags = a.tags;
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = [tags[i], tags[j]].sort().join(" <> ");
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    }
    return Object.entries(pairCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [a, b] = key.split(" <> ");
        return { tagA: a, tagB: b, count };
      });
  }, [articles]);

  /* ── Source intelligence ── */
  const sourceIntel = useMemo(() => {
    const map: Record<string, { count: number; sentiments: SentimentResult[]; tags: Record<string, number> }> = {};
    for (const { article, result } of sentimentData) {
      if (!map[article.sourceName]) {
        map[article.sourceName] = { count: 0, sentiments: [], tags: {} };
      }
      const d = map[article.sourceName];
      d.count++;
      d.sentiments.push(result);
      for (const t of article.tags) {
        d.tags[t] = (d.tags[t] || 0) + 1;
      }
    }

    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => {
        let pos = 0, neg = 0;
        for (const s of data.sentiments) {
          if (s.sentiment === "positive") pos++;
          else if (s.sentiment === "negative") neg++;
        }
        let avgSentiment: "positive" | "negative" | "neutral";
        if (pos > neg) avgSentiment = "positive";
        else if (neg > pos) avgSentiment = "negative";
        else avgSentiment = "neutral";

        const topTags = Object.entries(data.tags)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([t]) => t);

        return { name, count: data.count, avgSentiment, topTags };
      });
  }, [sentimentData]);

  /* ── Impact ranking ── */
  const impactRanking = useMemo(() => {
    const highImpact: { article: Article; summary: SmartSummary }[] = [];
    for (const a of articles) {
      const s = summaries.get(a.id);
      if (s && (s.impactLevel === "high" || s.impactLevel === "medium")) {
        highImpact.push({ article: a, summary: s });
      }
    }
    highImpact.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.summary.impactLevel] - order[b.summary.impactLevel];
    });
    return highImpact.slice(0, 10);
  }, [articles, summaries]);

  const sentimentDotColor = (s: string) => {
    if (s === "positive") return "var(--success)";
    if (s === "negative") return "var(--danger)";
    return "var(--muted)";
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60% 40%",
        height: "100%",
        overflow: "hidden",
        background: "var(--background)",
      }}
    >
      {/* ══════════ LEFT COLUMN ══════════ */}
      <div style={{ overflowY: "auto", padding: "24px 28px", borderRight: "1px solid var(--border)" }}>

        {/* ── AI MARKET BRIEF ── */}
        <div className="dash-section-title">AI MARKET BRIEF</div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                background: marketBrief.moodColor,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
              오늘의 시장: {marketBrief.mood}
            </span>
          </div>

          <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>기사</span>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "var(--foreground)" }}>{marketBrief.todayCount}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>속보</span>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: marketBrief.breakingCount > 0 ? "var(--danger)" : "var(--foreground)" }}>{marketBrief.breakingCount}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "var(--success)" }}>+{marketBrief.pos}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", margin: "0 4px" }}>/</span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{marketBrief.neu}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", margin: "0 4px" }}>/</span>
              <span style={{ fontSize: 10, color: "var(--danger)" }}>-{marketBrief.neg}</span>
            </div>
          </div>

          {marketBrief.topTags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {marketBrief.topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    border: "1px solid var(--border)",
                    color: "var(--accent)",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {tag} <span style={{ color: "var(--muted)" }}>{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <SectionSep />

        {/* ── SIGNAL MONITOR ── */}
        <div className="dash-section-title">SIGNAL MONITOR</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          {insights.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>분석할 데이터가 부족합니다</div>
          )}
          {insights.map((insight, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: INSIGHT_COLORS[insight.type],
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 9, fontWeight: 700, color: INSIGHT_COLORS[insight.type], letterSpacing: "0.05em" }}>
                  {INSIGHT_LABELS[insight.type]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{insight.title}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, marginLeft: 14 }}>
                {insight.description}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginLeft: 14 }}>
                <ConfidenceBar value={insight.confidence} />
                <span style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", color: "var(--muted)" }}>
                  {Math.round(insight.confidence)}%
                </span>
                <span style={{ fontSize: 9, color: "var(--muted)" }}>
                  {insight.basedOn.length}건 기반
                </span>
              </div>
              {insight.basedOn.length > 0 && (
                <div style={{ marginTop: 4, marginLeft: 14 }}>
                  {insight.basedOn.map((title, j) => {
                    const match = articles.find((a) => a.title === title);
                    return (
                      <div
                        key={j}
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          cursor: match ? "pointer" : "default",
                          padding: "1px 0",
                        }}
                        onClick={() => match && onSelectArticle(match)}
                        onMouseEnter={(e) => { if (match) (e.currentTarget.style.color = "var(--accent)"); }}
                        onMouseLeave={(e) => { if (match) (e.currentTarget.style.color = "var(--muted)"); }}
                      >
                        {match ? ">" : "-"} {title.length > 60 ? title.slice(0, 60) + "..." : title}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <SectionSep />

        {/* ── READ NEXT - RECOMMENDATIONS ── */}
        <div className="dash-section-title">READ NEXT</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {recommendations.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>추천할 기사가 없습니다</div>
          )}
          {recommendations.map((rec, i) => (
            <div
              key={rec.article.id}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
              onClick={() => {
                onSelectArticle(rec.article);
                onTabChange("news");
              }}
              onMouseEnter={(e) => {
                const titleEl = e.currentTarget.querySelector("[data-title]") as HTMLElement;
                if (titleEl) titleEl.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                const titleEl = e.currentTarget.querySelector("[data-title]") as HTMLElement;
                if (titleEl) titleEl.style.color = "var(--foreground)";
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  padding: "2px 5px",
                  border: "1px solid var(--border)",
                  color: rec.type === "breaking" ? "var(--danger)" : "var(--accent)",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {REC_LABELS[rec.type]}
              </span>
              <div>
                <div data-title style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4, transition: "color 0.15s" }}>
                  {rec.article.title}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                  {rec.reason}
                </div>
                <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2, fontFamily: "'Space Mono', monospace" }}>
                  {rec.article.sourceName} {timeAgo(rec.article.publishedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionSep />

        {/* ── SENTIMENT ANALYSIS ── */}
        <div className="dash-section-title">SENTIMENT ANALYSIS</div>
        <div style={{ marginTop: 12 }}>
          {/* Horizontal bar */}
          <div style={{ display: "flex", height: 6, width: "100%", marginBottom: 8 }}>
            <div style={{ width: `${(sentimentBar.neg / sentimentBar.total) * 100}%`, background: "var(--danger)" }} />
            <div style={{ width: `${(sentimentBar.neu / sentimentBar.total) * 100}%`, background: "var(--muted)" }} />
            <div style={{ width: `${(sentimentBar.pos / sentimentBar.total) * 100}%`, background: "var(--success)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "'Space Mono', monospace", marginBottom: 14 }}>
            <span style={{ color: "var(--danger)" }}>BEARISH {sentimentBar.neg}</span>
            <span style={{ color: "var(--muted)" }}>NEUTRAL {sentimentBar.neu}</span>
            <span style={{ color: "var(--success)" }}>BULLISH {sentimentBar.pos}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Top positive */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--success)", letterSpacing: "0.05em", marginBottom: 6 }}>TOP BULLISH</div>
              {sentimentBar.topPositive.map(({ article }) => (
                <div
                  key={article.id}
                  style={{ fontSize: 10, color: "var(--foreground)", padding: "3px 0", cursor: "pointer", lineHeight: 1.4 }}
                  onClick={() => onSelectArticle(article)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
                >
                  {article.title.length > 50 ? article.title.slice(0, 50) + "..." : article.title}
                </div>
              ))}
              {sentimentBar.topPositive.length === 0 && (
                <div style={{ fontSize: 10, color: "var(--muted)" }}>--</div>
              )}
            </div>
            {/* Top negative */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--danger)", letterSpacing: "0.05em", marginBottom: 6 }}>TOP BEARISH</div>
              {sentimentBar.topNegative.map(({ article }) => (
                <div
                  key={article.id}
                  style={{ fontSize: 10, color: "var(--foreground)", padding: "3px 0", cursor: "pointer", lineHeight: 1.4 }}
                  onClick={() => onSelectArticle(article)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
                >
                  {article.title.length > 50 ? article.title.slice(0, 50) + "..." : article.title}
                </div>
              ))}
              {sentimentBar.topNegative.length === 0 && (
                <div style={{ fontSize: 10, color: "var(--muted)" }}>--</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT COLUMN ══════════ */}
      <div style={{ overflowY: "auto", padding: "24px 24px" }}>

        {/* ── ENTITY TRACKER ── */}
        <div className="dash-section-title">ENTITY TRACKER</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {entityTracker.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>데이터 없음</div>
          )}
          {entityTracker.map(([name, count]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: count >= 5 ? 700 : 400,
                  color: count >= 5 ? "var(--accent)" : "var(--foreground)",
                  width: 120,
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
              <div style={{ flex: 1, height: 3, background: "var(--border)", position: "relative" }}>
                <div
                  style={{
                    width: `${(count / maxEntityFreq) * 100}%`,
                    height: "100%",
                    background: count >= 5 ? "var(--accent)" : "var(--muted)",
                  }}
                />
              </div>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)", width: 24, textAlign: "right" }}>
                {count}
              </span>
            </div>
          ))}
        </div>

        <SectionSep />

        {/* ── TOPIC NETWORK ── */}
        <div className="dash-section-title">TOPIC NETWORK</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {topicNetwork.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>데이터 없음</div>
          )}
          {topicNetwork.map(({ tagA, tagB, count }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{tagA}</span>
              <span style={{ color: "var(--muted)", fontSize: 10 }}>&harr;</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{tagB}</span>
              <span style={{ color: "var(--muted)", fontFamily: "'Space Mono', monospace", fontSize: 10, marginLeft: "auto" }}>
                {count}건
              </span>
            </div>
          ))}
        </div>

        <SectionSep />

        {/* ── SOURCE INTELLIGENCE ── */}
        <div className="dash-section-title">SOURCE INTELLIGENCE</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {sourceIntel.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>데이터 없음</div>
          )}
          {sourceIntel.map(({ name, count, avgSentiment, topTags }) => (
            <div key={name} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: sentimentDotColor(avgSentiment),
                  display: "inline-block",
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>{name}</span>
                  <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)" }}>{count}</span>
                </div>
                {topTags.length > 0 && (
                  <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                    {topTags.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <SectionSep />

        {/* ── IMPACT RANKING ── */}
        <div className="dash-section-title">IMPACT RANKING</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {impactRanking.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>데이터 없음</div>
          )}
          {impactRanking.map(({ article, summary }, i) => (
            <div
              key={article.id}
              style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}
              onClick={() => onSelectArticle(article)}
              onMouseEnter={(e) => {
                const t = e.currentTarget.querySelector("[data-rank-title]") as HTMLElement;
                if (t) t.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                const t = e.currentTarget.querySelector("[data-rank-title]") as HTMLElement;
                if (t) t.style.color = "var(--foreground)";
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'Space Mono', monospace",
                  color: "var(--muted)",
                  width: 18,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  data-rank-title
                  style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.4, transition: "color 0.15s" }}
                >
                  {article.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      padding: "1px 4px",
                      border: "1px solid",
                      borderColor: summary.impactLevel === "high" ? "var(--danger)" : "var(--accent)",
                      color: summary.impactLevel === "high" ? "var(--danger)" : "var(--accent)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {summary.impactLevel.toUpperCase()}
                  </span>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      background: sentimentDotColor(summary.sentiment),
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 9, color: "var(--muted)" }}>{article.sourceName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
