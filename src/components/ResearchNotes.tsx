"use client";

import { useMemo, useState } from "react";
import { Archive, Plus, RotateCw, Trash2, X } from "lucide-react";
import type { Article } from "@/types";
import { ALL_TAGS } from "@/lib/tagging/tagger";
import { useResearchNotes } from "@/hooks/useResearchNotes";
import {
  articlesForNote,
  isNoteActive,
  type ResearchNote,
} from "@/lib/research/notes";

interface ResearchNotesProps {
  open: boolean;
  onClose: () => void;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

function daysLeft(note: ResearchNote, now: Date): number {
  return Math.ceil((new Date(note.watchUntil).getTime() - now.getTime()) / 86_400_000);
}

function NoteForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (draft: {
    title: string;
    origin: string;
    url?: string;
    body: string;
    tags: string[];
    keywords: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("국제금융센터");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");

  const canSubmit = title.trim().length > 0 && (tags.length > 0 || keywords.trim().length > 0);

  return (
    <form
      className="rnote-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          title,
          origin,
          url: url.trim() || undefined,
          body,
          tags,
          // Split on commas only — "캐리 트레이드" is one term, not two.
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        });
      }}
    >
      <input
        autoFocus
        className="rnote-input"
        placeholder="무엇을 읽었나요? (예: 국제금융센터 이슈분석 — 엔캐리 청산 리스크)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="rnote-row">
        <input
          className="rnote-input"
          placeholder="출처"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          list="rnote-origins"
        />
        <datalist id="rnote-origins">
          <option value="국제금융센터" />
          <option value="Investing.com" />
          <option value="자체 메모" />
        </datalist>
        <input
          className="rnote-input"
          placeholder="링크 (선택 · 내 참조용)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <textarea
        className="rnote-textarea"
        placeholder="요지 — 무엇이 바뀌었고 무엇을 지켜볼 것인가"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="rnote-field">
        <span className="rnote-label">추적할 태그</span>
        <div className="rnote-tags">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`rnote-tag ${tags.includes(tag) ? "is-on" : ""}`}
              onClick={() =>
                setTags((prev) =>
                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                )
              }
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <input
        className="rnote-input"
        placeholder="키워드 — 태그로 안 잡히는 말 (쉼표 구분: 엔캐리, 역레포)"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />

      <div className="rnote-actions">
        <button type="submit" className="rnote-primary" disabled={!canSubmit}>
          추적 시작 · 30일
        </button>
        <button type="button" className="rnote-ghost" onClick={onCancel}>
          취소
        </button>
        {!canSubmit && (
          <span className="rnote-hint">제목과, 태그 또는 키워드가 최소 하나 필요합니다</span>
        )}
      </div>
    </form>
  );
}

export function ResearchNotes({ open, onClose, articles, onSelectArticle }: ResearchNotesProps) {
  const { notes, addNote, archiveNote, removeNote, extendNote } = useResearchNotes();
  const [composing, setComposing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Not memoised: the panel re-renders on every note change, and a stale "now"
  // captured at mount reported a freshly created 30-day note as 31 days.
  const now = new Date();

  const collected = useMemo(() => {
    const map = new Map<string, ReturnType<typeof articlesForNote>>();
    for (const note of notes) map.set(note.id, articlesForNote(note, articles));
    return map;
  }, [notes, articles]);

  if (!open) return null;

  const live = notes.filter((n) => isNoteActive(n, now));
  const past = notes.filter((n) => !isNoteActive(n, now));

  const renderNote = (note: ResearchNote) => {
    const hits = collected.get(note.id) ?? [];
    const isOpen = expanded === note.id;
    const left = daysLeft(note, now);
    const activeNow = isNoteActive(note, now);

    return (
      <li key={note.id} className={`rnote ${activeNow ? "" : "is-past"}`}>
        <button
          className="rnote-head"
          onClick={() => setExpanded(isOpen ? null : note.id)}
          aria-expanded={isOpen}
        >
          <span className="rnote-title">{note.title}</span>
          <span className="rnote-count">{hits.length}</span>
        </button>

        <div className="rnote-meta">
          <span className="rnote-origin">{note.origin}</span>
          {note.url && (
            <a
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rnote-link"
              onClick={(e) => e.stopPropagation()}
            >
              원문
            </a>
          )}
          <span className="rnote-spacer" />
          <span className="rnote-window">
            {activeNow ? `${left}일 남음` : note.archivedAt ? "보관됨" : "추적 종료"}
          </span>
        </div>

        {isOpen && (
          <div className="rnote-body">
            {note.body && <p className="rnote-text">{note.body}</p>}

            <div className="rnote-axis">
              {note.tags.map((t) => (
                <span key={t} className="rnote-axis-chip">#{t}</span>
              ))}
              {note.keywords.map((k) => (
                <span key={k} className="rnote-axis-chip is-keyword">{k}</span>
              ))}
            </div>

            {hits.length > 0 ? (
              <ul className="rnote-hits">
                {hits.slice(0, 12).map(({ article, match }) => (
                  <li key={article.id}>
                    <button className="rnote-hit" onClick={() => onSelectArticle(article)}>
                      <span className="rnote-hit-title">{article.title}</span>
                      <span className="rnote-hit-meta">
                        {article.sourceName} · {match.reasons.slice(0, 2).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rnote-empty">
                아직 걸린 기사가 없습니다. 새 기사가 들어오면 여기 쌓입니다.
              </p>
            )}

            <div className="rnote-controls">
              <button onClick={() => extendNote(note.id, 30)} title="30일 더 추적">
                <RotateCw size={13} /> 30일 연장
              </button>
              <button onClick={() => archiveNote(note.id)}>
                <Archive size={13} /> {note.archivedAt ? "보관 해제" : "보관"}
              </button>
              <button className="is-danger" onClick={() => removeNote(note.id)}>
                <Trash2 size={13} /> 삭제
              </button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="rnote-panel" role="dialog" aria-label="리서치 노트">
      <header className="rnote-panel-head">
        <div>
          <h2>리서치 노트</h2>
          <p>깊이 읽은 자료를 적어두면, 그 뒤 흐름을 와이어가 모읍니다.</p>
        </div>
        <button className="rnote-close" onClick={onClose} aria-label="닫기">
          <X size={16} />
        </button>
      </header>

      {composing ? (
        <NoteForm
          onSubmit={(draft) => {
            addNote({ ...draft });
            setComposing(false);
          }}
          onCancel={() => setComposing(false)}
        />
      ) : (
        <button className="rnote-new" onClick={() => setComposing(true)}>
          <Plus size={14} /> 읽은 자료 기록
        </button>
      )}

      {notes.length === 0 && !composing && (
        <p className="rnote-zero">
          국제금융센터 보고서나 Investing.com 분석을 읽고 나면 그 주제가 한동안
          유효한 관심 축이 됩니다. 여기 적어두면 관련 기사가 자동으로 쌓입니다.
        </p>
      )}

      {live.length > 0 && (
        <section>
          <div className="rnote-section">추적 중 {live.length}</div>
          <ul className="rnote-list">{live.map(renderNote)}</ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <div className="rnote-section">지난 노트 {past.length}</div>
          <ul className="rnote-list">{past.map(renderNote)}</ul>
        </section>
      )}
    </div>
  );
}
