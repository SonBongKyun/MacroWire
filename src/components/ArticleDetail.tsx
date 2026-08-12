"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  ChevronRight,
  ExternalLink,
  FileText,
  Plus,
  Radar,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
} from "lucide-react";
import type { Article, ArticleEnrichmentResult } from "@/types";
import { TAG_COLORS } from "@/lib/constants/colors";
import { useArticleNotes } from "@/hooks/useArticleNotes";
import { classifyArticleSignal } from "@/lib/news/signal";
import type { PersonalRelevanceResult } from "@/lib/personalization/relevance";
import { ArticleAiSummary } from "./ArticleAiSummary";

interface ArticleDetailProps {
  article: Article | null;
  onToggleRead: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  onTagClick?: (tag: string) => void;
  collectionName?: string;
  collectionNames?: string[];
  onCollectionChange?: (articleId: string, name: string) => void;
  onCreateCollection?: (name: string) => void;
  articles?: Article[];
  onSelectArticle?: (article: Article) => void;
  personalRelevance?: PersonalRelevanceResult;
  onOpenOriginal?: (article: Article) => void;
  onCreateNote?: (article: Article) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(0, Math.floor(diff / 60_000));
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function evidenceLabel(kind: string): string {
  if (kind === "official") return "공식 발표";
  if (kind === "rss") return "RSS";
  if (kind === "metadata") return "공개 metadata";
  if (kind === "coverage") return "관련 보도";
  return "규칙 분석";
}

function EventSections({
  article,
  enrichment,
  articles,
  onSelectArticle,
}: {
  article: Article;
  enrichment: ArticleEnrichmentResult | null;
  articles: Article[];
  onSelectArticle?: (article: Article) => void;
}) {
  const localArticles = useMemo(
    () => new Map(articles.map((item) => [item.id, item])),
    [articles],
  );
  const hasFacts = Boolean(enrichment?.keyFacts.length);
  const hasNumbers = Boolean(enrichment?.keyNumbers.length);
  const hasCoverage = Boolean(enrichment && enrichment.coverage.articles.length > 0);

  return (
    <div className="event-detail-stack">
      {hasFacts && (
        <section className="event-section" aria-labelledby="what-happened-heading">
          <div className="event-section-heading">
            <span className="event-section-index">01</span>
            <h3 id="what-happened-heading">WHAT HAPPENED</h3>
          </div>
          <ul className="event-facts">
            {enrichment!.keyFacts.map((fact, index) => (
              <li key={`${fact.text}-${index}`}>
                <span className="event-fact-mark" aria-hidden="true" />
                <div>
                  <p>{fact.text}</p>
                  <span>{evidenceLabel(fact.sourceKind)} · {fact.sourceLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasNumbers && (
        <section className="event-section" aria-labelledby="key-numbers-heading">
          <div className="event-section-heading">
            <span className="event-section-index">02</span>
            <h3 id="key-numbers-heading">KEY NUMBERS</h3>
          </div>
          <dl className="event-numbers">
            {enrichment!.keyNumbers.map((number, index) => (
              <div key={`${number.value}-${index}`} title={number.context}>
                <dt>{number.label}</dt>
                <dd>{number.value}</dd>
                <span>{number.sourceLabel}</span>
              </div>
            ))}
          </dl>
        </section>
      )}

      {enrichment?.whyItMatters && (
        <section className="event-section" aria-labelledby="why-it-matters-heading">
          <div className="event-section-heading">
            <span className="event-section-index">03</span>
            <h3 id="why-it-matters-heading">WHY IT MATTERS</h3>
            <span className="analysis-disclosure">Analysis · rules</span>
          </div>
          <p className="event-analysis">{enrichment.whyItMatters}</p>
        </section>
      )}

      {hasCoverage && (
        <section className="event-section" aria-labelledby="related-coverage-heading">
          <div className="event-section-heading">
            <span className="event-section-index">04</span>
            <h3 id="related-coverage-heading">RELATED COVERAGE</h3>
            <span className="coverage-confirmed">
              CONFIRMED BY {enrichment!.coverage.count} SOURCES
            </span>
          </div>
          <div className="coverage-outlets" aria-label="확인 매체">
            {enrichment!.coverage.outlets.map((outlet) => <span key={outlet}>{outlet}</span>)}
          </div>
          <div className="coverage-list">
            {enrichment!.coverage.articles.map((related) => {
              const local = localArticles.get(related.id);
              return (
                <article key={related.id} className="coverage-row">
                  <div>
                    <span>{related.sourceName} · {timeAgo(related.publishedAt)}</span>
                    <p>{related.title}</p>
                  </div>
                  <div className="coverage-row-actions">
                    {local && onSelectArticle && (
                      <button onClick={() => onSelectArticle(local)}>내부 보기</button>
                    )}
                    <a href={related.url} target="_blank" rel="noopener noreferrer" aria-label={`${related.sourceName} 원문 열기`}>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {enrichment && (
        <details className="event-section provenance-section">
          <summary>
            <span><ShieldCheck size={13} aria-hidden="true" /> Sources &amp; provenance</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="provenance-body" id="provenance-heading">
            <dl>
              <div>
                <dt>Source</dt>
                <dd>{article.sourceName}{article.sourceTier === "T0" ? " official release" : " RSS feed"}</dd>
              </div>
              <div>
                <dt>Data used</dt>
                <dd>
                  {[...new Set(enrichment.contentSources.map((source) => evidenceLabel(source.kind)))].join(" + ") || "확인 가능한 공개 데이터 없음"}
                </dd>
              </div>
              <div>
                <dt>Coverage</dt>
                <dd>{enrichment.coverage.count > 1 ? `${enrichment.coverage.count}개 독립 매체` : "단일 출처"}</dd>
              </div>
              {enrichment.analysisKind && (
                <div>
                  <dt>Analysis</dt>
                  <dd>위 출처에서 확인된 신호를 규칙 기반으로 해석</dd>
                </div>
              )}
            </dl>
          </div>
        </details>
      )}
    </div>
  );
}

export function ArticleDetail({
  article,
  onToggleRead,
  onToggleSave,
  onTagClick,
  collectionName = "",
  collectionNames = [],
  onCollectionChange,
  onCreateCollection,
  articles = [],
  onSelectArticle,
  personalRelevance,
  onOpenOriginal,
  onCreateNote,
}: ArticleDetailProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [newCollectionInput, setNewCollectionInput] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [highlightInput, setHighlightInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [enrichment, setEnrichment] = useState<ArticleEnrichmentResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(false);
  const [enrichmentAttempt, setEnrichmentAttempt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleNotes = useArticleNotes();

  const currentNote = article ? articleNotes.getNote(article.id) : null;
  const articleId = article?.id ?? null;
  const noteText = currentNote?.text || "";
  const highlights = currentNote?.highlights || [];
  const hasNote = noteText.trim().length > 0 || highlights.length > 0;

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of articles) {
      for (const tag of item.tags) counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
  }, [articles]);

  const fallbackSignal = useMemo(
    () => (article ? classifyArticleSignal(article) : null),
    [article],
  );
  const importance = enrichment?.importance ?? {
    tier: article?.importanceTier ?? (fallbackSignal?.tier === "important" ? "major" : fallbackSignal?.tier ?? "general"),
    score: article?.importanceScore ?? fallbackSignal?.score ?? 0,
    reasons: article?.importanceReasons ?? fallbackSignal?.reasons ?? [],
  };

  const nextUnreadArticle = useMemo(() => {
    if (!article || articles.length < 2) return null;
    const currentIndex = articles.findIndex((item) => item.id === article.id);
    for (let offset = 1; offset < articles.length; offset++) {
      const candidate = articles[(Math.max(0, currentIndex) + offset) % articles.length];
      if (!candidate.isRead) return candidate;
    }
    return null;
  }, [article, articles]);

  useEffect(() => {
    if (!articleId) return;
    const controller = new AbortController();
    // Reset stale detail state before starting the selected article's lazy request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnrichment(null);
    setEnrichmentError(false);
    setEnrichmentLoading(true);

    fetch(`/api/articles/${articleId}/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ArticleEnrichmentResult>;
      })
      .then(setEnrichment)
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setEnrichmentError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEnrichmentLoading(false);
      });

    return () => controller.abort();
  }, [articleId, enrichmentAttempt]);

  useEffect(() => {
    // The component stays mounted across selections, so its reading state must
    // be explicitly reset together with the imperative scroll container.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadProgress(0);
    setNotesOpen(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [articleId]);

  useEffect(() => {
    if (!fullscreen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [fullscreen]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1_700);
  }, []);

  const copyUrl = useCallback(() => {
    if (!article) return;
    navigator.clipboard.writeText(article.url).then(() => showToast("URL을 복사했습니다"));
  }, [article, showToast]);

  const shareArticle = useCallback(() => {
    if (!article) return;
    navigator.clipboard.writeText(`${article.title}\n${article.url}\n\nvia MacroWire`)
      .then(() => showToast("공유 텍스트를 복사했습니다"));
  }, [article, showToast]);

  const handleReadAndNext = useCallback(() => {
    if (!article) return;
    if (!article.isRead) onToggleRead(article);
    if (nextUnreadArticle && onSelectArticle) onSelectArticle(nextUnreadArticle);
  }, [article, nextUnreadArticle, onSelectArticle, onToggleRead]);

  if (!article) {
    return (
      <aside className="article-detail-empty">
        <FileText size={32} aria-hidden="true" />
        <strong>기사를 선택하세요</strong>
        <p>헤드라인을 선택하면 사건의 핵심과 확인 출처가 표시됩니다.</p>
      </aside>
    );
  }

  const coverageCount = enrichment?.coverage.count ?? 1;
  const sourceTier = article.sourceTier ?? "T2";

  return (
    <aside className="article-event-detail detail-enter" aria-label="기사 상세">
      <div className="reading-progress" style={{ width: `${readProgress * 100}%` }} />

      <header className="event-detail-header">
        <div className="event-kicker" aria-label="기사 메타데이터">
          <span>{article.sourceName}</span>
          <i aria-hidden="true" />
          <span>{timeAgo(article.publishedAt)}</span>
          <i aria-hidden="true" />
          {importance.tier !== "general" && (
            <>
              <span className={`importance-label is-${importance.tier}`} title={importance.reasons.join(" · ")}>
                <Radar size={11} /> {importance.tier === "critical" ? "MARKET CRITICAL" : "MARKET SIGNAL"}
              </span>
              <i aria-hidden="true" />
            </>
          )}
          {coverageCount > 1 && <span>{coverageCount} SOURCES</span>}
        </div>
        <h2>{article.title}</h2>
        <div className="event-byline">
          <span>{sourceTier} · {formatDate(article.publishedAt)} {formatTime(article.publishedAt)}</span>
          {enrichment?.entities.map((entity) => <span key={entity} className="event-entity">{entity}</span>)}
        </div>
      </header>

      <div
        className="event-detail-scroll"
        ref={scrollRef}
        onScroll={() => {
          const element = scrollRef.current;
          if (!element) return;
          const distance = element.scrollHeight - element.clientHeight;
          setReadProgress(distance > 0 ? Math.min(1, element.scrollTop / distance) : 0);
        }}
      >
        {enrichmentLoading && (
          <div className="enrichment-status"><RefreshCw size={13} className="animate-spin" /> 공개 근거와 관련 보도를 확인하는 중</div>
        )}

        {enrichmentError && (
          <div className="enrichment-status is-error">
            <span>상세 보강에 실패했습니다. 확보된 RSS 발췌만 표시합니다.</span>
            <button onClick={() => setEnrichmentAttempt((value) => value + 1)}>다시 확인</button>
          </div>
        )}

        {!enrichment && !enrichmentLoading && article.summary && (
          <section className="event-section raw-excerpt">
            <div className="event-section-heading"><h3>RSS EXCERPT</h3></div>
            <p>{article.summary}</p>
          </section>
        )}

        {enrichment && enrichment.keyFacts.length === 0 && (
          <div className="enrichment-status is-minimal">
            이 기사에는 확인 가능한 발췌나 공개 metadata가 없습니다. 없는 사실은 보충하지 않았습니다.
          </div>
        )}

        {personalRelevance?.isHigh && (
          <section className="event-section personal-context" aria-labelledby="personal-context-heading">
            <div className="event-section-heading">
              <Target size={13} aria-hidden="true" />
              <h3 id="personal-context-heading">WHY YOU&apos;RE SEEING THIS</h3>
              <span className="personal-context-label">FOR YOU</span>
            </div>
            <div className="personal-context-reasons">
              {personalRelevance.reasons.map((reason) => <span key={reason}>{reason}</span>)}
            </div>
            {personalRelevance.assets.length > 0 && (
              <p>Related <strong>{personalRelevance.assets.join(" · ")}</strong></p>
            )}
          </section>
        )}

        <ArticleAiSummary articleId={article.id} />

        <EventSections
          article={article}
          enrichment={enrichment}
          articles={articles}
          onSelectArticle={onSelectArticle}
        />

        {article.tags.length > 0 && (
          <section className="event-section event-tags" aria-labelledby="event-tags-heading">
            <div className="event-section-heading"><h3 id="event-tags-heading">TAGS</h3></div>
            <div>
              {article.tags.map((tag) => {
                const color = TAG_COLORS[tag] || "#718096";
                return (
                  <button
                    key={tag}
                    onClick={() => onTagClick?.(tag)}
                    style={{ color, borderColor: `color-mix(in srgb, ${color} 38%, transparent)` }}
                    title={`${tag} · ${tagCounts[tag] || 0}건`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="event-section event-notes">
          <button className="event-notes-toggle" onClick={() => setNotesOpen((value) => !value)}>
            <ChevronRight size={13} className={notesOpen ? "rotate-90" : ""} />
            <span>NOTES</span>
            {hasNote && <b>{(noteText.trim() ? 1 : 0) + highlights.length}</b>}
          </button>
          {notesOpen && (
            <div className="event-notes-body">
              <textarea
                rows={3}
                value={noteText}
                onChange={(event) => {
                  if (!noteText.trim() && event.target.value.trim()) onCreateNote?.(article);
                  articleNotes.saveNote(article.id, event.target.value);
                }}
                placeholder="이 사건에 대한 메모"
              />
              {highlights.map((highlight) => (
                <div className="detail-highlight" key={highlight}>
                  {highlight}
                  <button onClick={() => articleNotes.removeHighlight(article.id, highlight)} aria-label="하이라이트 삭제">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="event-highlight-input">
                <input
                  value={highlightInput}
                  onChange={(event) => setHighlightInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && highlightInput.trim()) {
                      if (!hasNote) onCreateNote?.(article);
                      articleNotes.addHighlight(article.id, highlightInput.trim());
                      setHighlightInput("");
                    }
                  }}
                  placeholder="하이라이트 추가"
                />
                <button
                  onClick={() => {
                    if (!highlightInput.trim()) return;
                    articleNotes.addHighlight(article.id, highlightInput.trim());
                    setHighlightInput("");
                  }}
                >
                  <Plus size={13} /> 추가
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {article.isSaved && onCollectionChange && (
        <div className="event-collection-row">
          <select value={collectionName} onChange={(event) => onCollectionChange(article.id, event.target.value)}>
            <option value="">분류 없음</option>
            {collectionNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <input value={newCollectionInput} onChange={(event) => setNewCollectionInput(event.target.value)} placeholder="새 컬렉션" />
          <button onClick={() => {
            const name = newCollectionInput.trim();
            if (!name) return;
            onCreateCollection?.(name);
            onCollectionChange(article.id, name);
            setNewCollectionInput("");
          }}>+</button>
        </div>
      )}

      <footer className="event-detail-actions">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="event-original-cta" onClick={() => onOpenOriginal?.(article)}>
          <span>OPEN ORIGINAL</span>
          <small>{article.sourceName}</small>
          <ExternalLink size={14} />
        </a>
        <button onClick={handleReadAndNext} title="읽음 처리 후 다음 기사" aria-label="읽음 처리 후 다음 기사"><CheckCheck size={15} /></button>
        <button onClick={() => setFullscreen(true)} title="전체 화면" aria-label="전체 화면 열기"><FileText size={15} /></button>
        <button onClick={copyUrl} title="URL 복사" aria-label="기사 URL 복사">URL</button>
        <button onClick={shareArticle} title="공유" aria-label="기사 공유 텍스트 복사">공유</button>
        <button onClick={() => onToggleRead(article)} className={article.isRead ? "is-active" : ""} title="읽음 전환" aria-label="기사 읽음 전환">✓</button>
        <button onClick={() => onToggleSave(article)} className={article.isSaved ? "is-active" : ""} title="저장 전환" aria-label="기사 저장 전환">★</button>
      </footer>

      {toast && <div className="event-detail-toast">{toast}</div>}

      {fullscreen && (
        <div className="fullscreen-overlay" onClick={(event) => event.target === event.currentTarget && setFullscreen(false)}>
          <div className="fullscreen-reader event-fullscreen-reader">
            <button className="fullscreen-close" onClick={() => setFullscreen(false)} aria-label="전체 화면 닫기">×</button>
            <div className="event-kicker"><span>{article.sourceName}</span><i /><span>{formatDate(article.publishedAt)}</span></div>
            <h1>{article.title}</h1>
            <EventSections article={article} enrichment={enrichment} articles={articles} onSelectArticle={onSelectArticle} />
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="event-original-cta" onClick={() => onOpenOriginal?.(article)}>
              <span>OPEN ORIGINAL</span><small>{article.sourceName}</small><ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}
