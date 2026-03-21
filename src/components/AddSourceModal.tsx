"use client";

import { useState } from "react";

interface AddSourceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (source: { name: string; feedUrl: string; category: string }) => void;
}

const CATEGORIES = [
  { value: "policy", label: "정책·기관" },
  { value: "macro", label: "매크로·경제" },
  { value: "global", label: "글로벌·국제" },
  { value: "fx", label: "환율·증권" },
  { value: "semicon", label: "반도체·기술" },
];

export function AddSourceModal({ open, onClose, onAdd }: AddSourceModalProps) {
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState("macro");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !feedUrl.trim()) {
      setError("이름과 RSS URL을 모두 입력해주세요.");
      return;
    }
    try {
      new URL(feedUrl);
    } catch {
      setError("올바른 URL을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      onAdd({ name: name.trim(), feedUrl: feedUrl.trim(), category });
      setName("");
      setFeedUrl("");
      setCategory("macro");
      onClose();
    } catch (e) {
      setError("소스 추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-[440px] rounded-[var(--radius-lg)] glass-modal border border-[var(--border)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] glass-header">
          <h3 className="text-[13px] font-extrabold text-[var(--foreground-bright)] flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            RSS 소스 추가
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)]">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">소스 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Bloomberg Korea"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">RSS Feed URL</label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://example.com/rss"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-[11px] text-[var(--danger)] font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[11px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)]">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-[11px] font-bold rounded-[var(--radius-sm)] btn-primary"
          >
            {loading ? "추가 중..." : "소스 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
