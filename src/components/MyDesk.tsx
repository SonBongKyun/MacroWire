"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Radio, Target } from "lucide-react";
import type { Article, Source } from "@/types";
import type { PersonalRelevanceResult } from "@/lib/personalization/relevance";
import { getEconEvents } from "@/lib/calendar/econ";
import { EventDesk } from "@/components/EventDesk";

interface MyDeskProps {
  articles: Article[];
  sources: Source[];
  personalScores: Map<string, PersonalRelevanceResult>;
  onSelectArticle: (article: Article) => void;
  onOpenWire: () => void;
}

function formatTimeAgo(publishedAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(publishedAt).getTime()) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  return `${Math.floor(hours / 24)}일`;
}

function articleRank(
  article: Article,
  personalScores: Map<string, PersonalRelevanceResult>,
): [number, number, number, number] {
  const relevance = personalScores.get(article.id);
  return [
    relevance?.isHigh ? 1 : 0,
    relevance?.score ?? 0,
    article.importanceScore ?? 0,
    new Date(article.publishedAt).getTime(),
  ];
}

function compareRank(a: Article, b: Article, scores: Map<string, PersonalRelevanceResult>) {
  const left = articleRank(a, scores);
  const right = articleRank(b, scores);
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return right[index] - left[index];
  }
  return 0;
}

export function MyDesk({ articles, sources, personalScores, onSelectArticle, onOpenWire }: MyDeskProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const ranked = useMemo(
    () => [...articles].sort((a, b) => compareRank(a, b, personalScores)),
    [articles, personalScores],
  );
  const wire = useMemo(() => [...articles]
    .sort((a, b) => {
      const aHigh = personalScores.get(a.id)?.isHigh ? 1 : 0;
      const bHigh = personalScores.get(b.id)?.isHigh ? 1 : 0;
      return bHigh - aHigh || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, 8), [articles, personalScores]);

  const signals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of ranked.slice(0, 24)) {
      const relevance = personalScores.get(article.id);
      if (!relevance?.isHigh) continue;
      for (const label of relevance.topicLabels) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
  }, [personalScores, ranked]);

  const next24h = useMemo(() => {
    if (!now) return [];
    return getEconEvents(new Date(now), { lookbackDays: 0, lookaheadDays: 2 })
      .filter((event) => event.at.getTime() > now && event.at.getTime() <= now + 24 * 60 * 60_000)
      .slice(0, 5);
  }, [now]);

  return (
    <main className="my-desk" aria-label="MY DESK">
      <header className="my-desk-header">
        <div>
          <span className="my-desk-kicker">PERSONAL MARKET INTELLIGENCE</span>
          <h1>MY DESK</h1>
          <p>뉴스를 반복해서 읽지 않고, 사건과 시장 전이 경로를 먼저 봅니다.</p>
        </div>
        <div className="my-desk-status">
          <span><i /> LIVE WIRE</span>
          <b>{sources.filter((source) => source.enabled).length} sources</b>
        </div>
      </header>

      <EventDesk
        articles={articles}
        onSelectArticle={onSelectArticle}
        onOpenWire={onOpenWire}
      />

      <div className="my-desk-columns">
        <section className="my-desk-card" aria-labelledby="my-signals-title">
          <div className="my-desk-section-head">
            <div><Target size={14} /><h2 id="my-signals-title">MY SIGNALS</h2></div>
          </div>
          <div className="my-signal-list">
            {signals.map(([label, count]) => (
              <div key={label}><span>{label}</span><b>{count}</b></div>
            ))}
            {signals.length === 0 && <p className="my-desk-empty">고관련성 신호를 계산하는 중입니다.</p>}
          </div>
        </section>

        <section className="my-desk-card" aria-labelledby="next-24h-title">
          <div className="my-desk-section-head">
            <div><CalendarClock size={14} /><h2 id="next-24h-title">NEXT 24H</h2></div>
          </div>
          <div className="my-calendar-list">
            {next24h.map((event) => (
              <div key={event.id}>
                <time>{event.kstTime}</time>
                <span>{event.title}</span>
                <b>{event.region}</b>
              </div>
            ))}
            {now && next24h.length === 0 && <p className="my-desk-empty">향후 24시간 내 주요 일정이 없습니다.</p>}
          </div>
        </section>
      </div>

      <section className="my-desk-wire" aria-labelledby="my-wire-title">
        <div className="my-desk-section-head">
          <div><Radio size={14} /><h2 id="my-wire-title">RAW WIRE</h2></div>
          <span>이벤트 아래에서 원문 헤드라인을 최신순으로 확인</span>
        </div>
        <div className="my-wire-list">
          {wire.map((article) => {
            const relevance = personalScores.get(article.id);
            return (
              <button type="button" key={article.id} onClick={() => onSelectArticle(article)}>
                <span className="my-wire-source">{article.sourceName}</span>
                <strong>{article.title}</strong>
                <span className="my-wire-meta">
                  {relevance?.isHigh ? "FOR YOU" : now ? formatTimeAgo(article.publishedAt, now) : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
