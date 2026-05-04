"use client";

import { useState, useEffect, useCallback } from "react";
import type { Article } from "@/types";

interface Memo {
  id: string;
  text: string;
  tags: string[];
  linkedArticleIds: string[];
  createdAt: string;
}

interface MemoStore {
  memos: Memo[];
}

const STORAGE_KEY = "macro-wire-memos";

function loadStore(): MemoStore {
  if (typeof window === "undefined") return { memos: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { memos: [] };
}

function persistStore(store: MemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${h}:${m}`;
}

interface InsightMemoProps {
  open: boolean;
  onClose: () => void;
  articles: Article[];
}

export function InsightMemo({ open, onClose, articles }: InsightMemoProps) {
  const [store, setStore] = useState<MemoStore>(loadStore);
  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [linkedArticleIds, setLinkedArticleIds] = useState<string[]>([]);
  const [showArticlePicker, setShowArticlePicker] = useState(false);
  const [articleSearch, setArticleSearch] = useState("");
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Reload store when opening
  useEffect(() => {
    if (open) setStore(loadStore());
  }, [open]);

  const recentMemos = store.memos.slice(0, 10);

  const saveMemo = useCallback(() => {
    if (!text.trim()) return;
    const memo: Memo = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      tags,
      linkedArticleIds,
      createdAt: new Date().toISOString(),
    };
    const next: MemoStore = { memos: [memo, ...store.memos].slice(0, 100) };
    setStore(next);
    persistStore(next);
    setText("");
    setTags([]);
    setLinkedArticleIds([]);
    setTagInput("");
  }, [text, tags, linkedArticleIds, store]);

  const deleteMemo = useCallback((id: string) => {
    setStore((prev) => {
      const next = { memos: prev.memos.filter((m) => m.id !== id) };
      persistStore(next);
      return next;
    });
  }, []);

  const copyMemo = useCallback((memo: Memo) => {
    const tagStr = memo.tags.length > 0 ? `\n\uD0DC\uADF8: ${memo.tags.join(", ")}` : "";
    const linkedTitles = memo.linkedArticleIds
      .map((id) => articles.find((a) => a.id === id)?.title)
      .filter(Boolean);
    const linkedStr =
      linkedTitles.length > 0
        ? `\n\uAD00\uB828 \uAE30\uC0AC:\n${linkedTitles.map((t) => `  - ${t}`).join("\n")}`
        : "";
    const full = `${memo.text}${tagStr}${linkedStr}\n\n${formatTimestamp(memo.createdAt)} via MacroWire`;
    navigator.clipboard.writeText(full).then(() => {
      setCopyToast(memo.id);
      setTimeout(() => setCopyToast(null), 1200);
    });
  }, [articles]);

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const toggleLinkedArticle = useCallback((id: string) => {
    setLinkedArticleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const filteredArticles = articleSearch.trim()
    ? articles
        .filter((a) => a.title.toLowerCase().includes(articleSearch.toLowerCase()))
        .slice(0, 8)
    : articles.slice(0, 8);

  if (!open) return null;

  return (
    <div
      className="fixed right-4 top-14 z-40 animate-fade-in"
      style={{ width: 320 }}
    >
      <div
        className="glass-modal border shadow-2xl flex flex-col"
        style={{
          borderColor: "#2C2D34",
          background: "#131316",
          maxHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "#2C2D34" }}
        >
          <h3
            className="font-heading font-bold text-[13px]"
            style={{ color: "#EBEBEB" }}
          >
            {"\uC778\uC0AC\uC774\uD2B8 \uBA54\uBAA8"}
          </h3>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-[#8C8C91] hover:text-[#EBEBEB] transition-colors text-xs"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Compose area */}
        <div className="px-4 py-3 space-y-2.5">
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"\uC2DC\uC7A5 \uC778\uC0AC\uC774\uD2B8\uB97C \uAE30\uB85D\uD558\uC138\uC694..."}
            className="w-full bg-[#1B1C22] border px-3 py-2 text-[12px] text-[#EBEBEB] placeholder-[#8C8C91] focus:outline-none resize-none"
            style={{ borderColor: "#2C2D34", fontSize: 12 }}
            onFocus={(e) => {
              (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,176,0,0.4)";
            }}
            onBlur={(e) => {
              (e.target as HTMLTextAreaElement).style.borderColor = "#2C2D34";
            }}
          />

          {/* Tags */}
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#8C8C91" }}>
              {"\uD0DC\uADF8"}
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px]"
                  style={{
                    color: "#FFB000",
                    background: "rgba(255,176,0,0.1)",
                    border: "1px solid rgba(255,176,0,0.2)",
                  }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-[8px] hover:text-[#EBEBEB] transition-colors"
                  >
                    {"\u2715"}
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
                placeholder={"\uD0DC\uADF8 \uCD94\uAC00..."}
                className="bg-transparent text-[10px] text-[#EBEBEB] placeholder-[#8C8C91] focus:outline-none"
                style={{ width: 70 }}
              />
            </div>
          </div>

          {/* Related articles */}
          <div>
            <button
              onClick={() => setShowArticlePicker((v) => !v)}
              className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ color: "#8C8C91" }}
            >
              {"\uAD00\uB828 \uAE30\uC0AC"}
              <svg
                className={`w-2 h-2 transition-transform ${showArticlePicker ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {linkedArticleIds.length > 0 && (
                <span className="text-[9px] font-semibold" style={{ color: "#FFB000" }}>
                  {linkedArticleIds.length}
                </span>
              )}
            </button>

            {/* Linked article badges */}
            {linkedArticleIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {linkedArticleIds.map((id) => {
                  const a = articles.find((x) => x.id === id);
                  if (!a) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] truncate"
                      style={{
                        maxWidth: 200,
                        color: "#EBEBEB",
                        background: "rgba(255,176,0,0.06)",
                        border: "1px solid #2C2D34",
                      }}
                    >
                      {a.title.slice(0, 30)}...
                      <button
                        onClick={() => toggleLinkedArticle(id)}
                        className="text-[8px] text-[#8C8C91] hover:text-[#EBEBEB] shrink-0"
                      >
                        {"\u2715"}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {showArticlePicker && (
              <div className="mt-1.5 space-y-1">
                <input
                  type="text"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  placeholder={"\uAE30\uC0AC \uAC80\uC0C9..."}
                  className="w-full bg-[#1B1C22] border px-2 py-1 text-[10px] text-[#EBEBEB] placeholder-[#8C8C91] focus:outline-none"
                  style={{ borderColor: "#2C2D34" }}
                />
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: 120 }}
                >
                  {filteredArticles.map((a) => {
                    const isLinked = linkedArticleIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleLinkedArticle(a.id)}
                        className="w-full text-left px-2 py-1 text-[10px] truncate transition-colors flex items-center gap-1.5"
                        style={{
                          color: isLinked ? "#FFB000" : "#EBEBEB",
                          background: isLinked ? "rgba(255,176,0,0.08)" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isLinked) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isLinked) (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span className="shrink-0 w-3 text-center text-[8px]">
                          {isLinked ? "\u2713" : ""}
                        </span>
                        <span className="truncate">{a.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={saveMemo}
            disabled={!text.trim()}
            className="w-full py-2 text-[11px] font-bold transition-colors"
            style={{
              background: text.trim() ? "rgba(255,176,0,0.15)" : "rgba(255,176,0,0.05)",
              color: text.trim() ? "#FFB000" : "#8C8C91",
              border: `1px solid ${text.trim() ? "rgba(255,176,0,0.3)" : "#2C2D34"}`,
              cursor: text.trim() ? "pointer" : "default",
            }}
          >
            {"\uC800\uC7A5"}
          </button>
        </div>

        {/* Previous memos */}
        {recentMemos.length > 0 && (
          <div
            className="border-t overflow-y-auto flex-1"
            style={{ borderColor: "#2C2D34", maxHeight: 300 }}
          >
            <div className="px-4 pt-2.5 pb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#8C8C91" }}>
                {"\uCD5C\uADFC \uBA54\uBAA8"}
              </span>
            </div>
            {recentMemos.map((memo) => (
              <div
                key={memo.id}
                className="px-4 py-2.5 border-b"
                style={{ borderColor: "#2C2D34" }}
              >
                <p className="text-[11px] leading-[1.6]" style={{ color: "#EBEBEB" }}>
                  {memo.text}
                </p>
                {memo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {memo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1 py-0"
                        style={{ color: "#FFB000", background: "rgba(255,176,0,0.08)" }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {memo.linkedArticleIds.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {memo.linkedArticleIds.map((id) => {
                      const a = articles.find((x) => x.id === id);
                      return a ? (
                        <p key={id} className="text-[9px] truncate" style={{ color: "#8C8C91" }}>
                          {"\u2192"} {a.title}
                        </p>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] tabular-nums" style={{ color: "#8C8C91" }}>
                    {formatTimestamp(memo.createdAt)}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => copyMemo(memo)}
                    className="text-[9px] font-semibold transition-colors"
                    style={{ color: copyToast === memo.id ? "#FFB000" : "#8C8C91" }}
                  >
                    {copyToast === memo.id ? "\uBCF5\uC0AC\uB428!" : "\uBCF5\uC0AC"}
                  </button>
                  <button
                    onClick={() => deleteMemo(memo.id)}
                    className="text-[9px] transition-colors"
                    style={{ color: "#8C8C91" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8C8C91"; }}
                  >
                    {"\uC0AD\uC81C"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
