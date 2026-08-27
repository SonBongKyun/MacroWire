"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { Article, EventsResponse, WireEvent, WireEventMarketImpact } from "@/types";
import styles from "./EventDesk.module.css";

interface EventDeskProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onOpenWire: () => void;
}

function timeAgo(value: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function impactIcon(impact: WireEventMarketImpact) {
  if (impact.direction === "up") return <ArrowUp size={12} aria-hidden="true" />;
  if (impact.direction === "down") return <ArrowDown size={12} aria-hidden="true" />;
  return <CircleDot size={10} aria-hidden="true" />;
}

function impactLabel(impact: WireEventMarketImpact): string {
  if (impact.direction === "up") return "상승 압력";
  if (impact.direction === "down") return "하락 압력";
  if (impact.direction === "mixed") return "혼조 가능";
  return "반응 확인";
}

function EventCard({
  event,
  rank,
  now,
  expanded,
  onToggle,
  articleMap,
  onSelectArticle,
}: {
  event: WireEvent;
  rank: number;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  articleMap: Map<string, Article>;
  onSelectArticle: (article: Article) => void;
}) {
  const primary = event.articles.find((article) => article.isPrimary) ?? event.articles[0];
  const localArticle = primary ? articleMap.get(primary.id) : undefined;

  return (
    <article className={`${styles.eventCard} ${styles[event.deskTier]}`}>
      <div className={styles.eventTopline}>
        <span className={styles.rank}>0{rank}</span>
        <span className={styles.score}>DESK {event.deskScore}</span>
        <span className={styles.confidence}>{event.confidence.toUpperCase()} CONF.</span>
        <span className={styles.age}>{timeAgo(event.latestPublishedAt, now)}</span>
      </div>

      <h3 className={styles.title}>{event.title}</h3>
      <p className={styles.explanation}>{event.shortExplanation}</p>

      <div className={styles.metaRow}>
        <span><b>{event.distinctSources}</b> independent sources</span>
        <span><b>{event.evidenceCount}</b> evidence items</span>
        {event.officialSourceName && (
          <span className={styles.official}><ShieldCheck size={12} /> {event.officialSourceName}</span>
        )}
      </div>

      {event.marketImpacts.length > 0 && (
        <div className={styles.impactStrip} aria-label="시장 영향 경로">
          {event.marketImpacts.map((impact) => (
            <div key={impact.channel} className={`${styles.impactChip} ${styles[impact.direction]}`} title={impact.rationale}>
              <span>{impact.label}</span>
              <b>{impactIcon(impact)} {impactLabel(impact)}</b>
            </div>
          ))}
        </div>
      )}

      {event.importanceReasons.length > 0 && (
        <div className={styles.reasonRow}>
          {event.importanceReasons.map((reason) => <span key={reason}>{reason}</span>)}
        </div>
      )}

      <div className={styles.actions}>
        {localArticle && (
          <button type="button" onClick={() => onSelectArticle(localArticle)}>
            상세 분석 <ArrowUpRight size={13} />
          </button>
        )}
        <button type="button" onClick={onToggle} aria-expanded={expanded}>
          원문 근거 {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {expanded && (
        <div className={styles.evidencePanel}>
          <div className={styles.transmission}>
            <strong>MARKET TRANSMISSION</strong>
            {event.marketImpacts.map((impact) => (
              <p key={impact.channel}>
                <b>{impact.label}</b>
                <span>{impact.rationale}</span>
              </p>
            ))}
          </div>

          <div className={styles.evidenceList}>
            <strong>SOURCE EVIDENCE · 중복 제거</strong>
            {event.articles.map((article) => (
              <div key={article.id} className={styles.evidenceItem}>
                <div className={styles.evidenceMeta}>
                  <span className={styles.sourceTier}>{article.sourceTier}</span>
                  <span>{article.sourceName}</span>
                  <time>{timeAgo(article.publishedAt, now)}</time>
                  {article.isPrimary && <em>PRIMARY</em>}
                </div>
                <p>{article.title}</p>
                {article.excerpt && <small>{article.excerpt}</small>}
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  원문 열기 <ArrowUpRight size={11} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function EventDesk({ articles, onSelectArticle, onOpenWire }: EventDeskProps) {
  const [events, setEvents] = useState<WireEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const articleMap = useMemo(() => new Map(articles.map((article) => [article.id, article])), [articles]);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/events?range=24h&limit=8&minScore=30", {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`events ${response.status}`);
      const payload: EventsResponse = await response.json();
      setEvents(Array.isArray(payload.data) ? payload.data : []);
      setGeneratedAt(payload.generatedAt ?? new Date().toISOString());
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      console.error("[EventDesk] failed to load events", cause);
      setError("이벤트 데스크를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.clearInterval(clock);
    };
  }, [load]);

  const topEvents = events.slice(0, 4);

  return (
    <section className={styles.shell} aria-labelledby="macro-event-desk-title">
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.kicker}><Radio size={12} /> LIVE MACRO EVENT DESK</span>
          <h2 id="macro-event-desk-title">WHAT CHANGED</h2>
          <p>기사보다 사건을 먼저 봅니다. 중복 제거 · 중요도 · 시장 전이 · 원문 근거.</p>
        </div>
        <div className={styles.headActions}>
          {generatedAt && <span>REFRESH {timeAgo(generatedAt, now)}</span>}
          <button type="button" onClick={onOpenWire}>전체 와이어 <ArrowUpRight size={13} /></button>
        </div>
      </div>

      {loading && <div className={styles.state}>이벤트를 재구성하는 중입니다.</div>}
      {!loading && error && <div className={styles.state}>{error}</div>}
      {!loading && !error && topEvents.length === 0 && (
        <div className={styles.state}>현재 묶을 수 있는 매크로 이벤트를 기다리고 있습니다.</div>
      )}

      <div className={styles.grid}>
        {topEvents.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            rank={index + 1}
            now={now}
            expanded={expandedId === event.id}
            onToggle={() => setExpandedId((current) => current === event.id ? null : event.id)}
            articleMap={articleMap}
            onSelectArticle={onSelectArticle}
          />
        ))}
      </div>
    </section>
  );
}
