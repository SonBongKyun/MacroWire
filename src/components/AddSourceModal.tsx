"use client";

import { useState, useRef } from "react";

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

type TabId = "manual" | "opml";

interface OpmlResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function AddSourceModal({ open, onClose, onAdd }: AddSourceModalProps) {
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState("macro");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("manual");

  // OPML state
  const [opmlLoading, setOpmlLoading] = useState(false);
  const [opmlResult, setOpmlResult] = useState<OpmlResult | null>(null);
  const [opmlError, setOpmlError] = useState("");
  const [opmlFileName, setOpmlFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleOpmlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOpmlFileName(file.name);
    setOpmlResult(null);
    setOpmlError("");
    setOpmlLoading(true);

    try {
      const content = await file.text();
      const res = await fetch("/api/sources/opml", {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: content,
      });

      if (!res.ok) {
        const data = await res.json();
        setOpmlError(data.error || "OPML 가져오기에 실패했습니다.");
        return;
      }

      const result: OpmlResult = await res.json();
      setOpmlResult(result);
    } catch {
      setOpmlError("OPML 파일을 처리하는 중 오류가 발생했습니다.");
    } finally {
      setOpmlLoading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpmlExport = async () => {
    try {
      const res = await fetch("/api/sources/opml");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ryzm-sources.opml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setOpmlError("OPML 내보내기에 실패했습니다.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-[440px] glass-modal border border-[var(--border)] animate-fade-in"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] glass-header">
          <h3 className="text-[13px] font-extrabold text-[var(--foreground-bright)] flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            RSS 소스 관리
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-6 h-6 flex items-center justify-center hover:bg-[var(--surface-hover)]">
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--border)]">
          {([
            { id: "manual" as TabId, label: "직접 추가" },
            { id: "opml" as TabId, label: "OPML 가져오기" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{
                color: activeTab === tab.id ? "#FFB000" : "#8C8C91",
                borderBottom: activeTab === tab.id ? "2px solid #FFB000" : "2px solid transparent",
                background: "none",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Manual tab */}
        {activeTab === "manual" && (
          <>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">소스 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: Bloomberg Korea"
                  className="w-full bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-[12px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">RSS Feed URL</label>
                <input
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/rss"
                  className="w-full bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-[12px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-[12px] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
                  style={{ borderRadius: 0 }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-[11px] text-[var(--danger)] font-medium">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-[11px] font-medium metal-btn text-[var(--muted)]" style={{ borderRadius: 0 }}>
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-[11px] font-bold btn-primary"
                style={{ borderRadius: 0 }}
              >
                {loading ? "추가 중..." : "소스 추가"}
              </button>
            </div>
          </>
        )}

        {/* OPML tab */}
        {activeTab === "opml" && (
          <>
            <div className="p-5 space-y-4">
              {/* Import section */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">OPML 파일 가져오기</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".opml,.xml"
                  onChange={handleOpmlFileSelect}
                  className="hidden"
                  id="opml-file-input"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={opmlLoading}
                  className="w-full border border-dashed border-[var(--border)] py-4 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors cursor-pointer flex flex-col items-center gap-1.5"
                  style={{ borderRadius: 0, background: "var(--background)" }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {opmlLoading ? "처리 중..." : opmlFileName ? opmlFileName : ".opml 파일을 선택하세요"}
                </button>
              </div>

              {/* Import results */}
              {opmlResult && (
                <div className="border border-[var(--border)] p-3 space-y-1.5" style={{ borderRadius: 0, background: "var(--background)" }}>
                  <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">가져오기 결과</div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>{opmlResult.imported}</span>
                    <span style={{ color: "var(--muted)" }}>개 추가됨</span>
                  </div>
                  {opmlResult.skipped > 0 && (
                    <div className="flex items-center gap-2 text-[12px]">
                      <span style={{ color: "#FFB000", fontWeight: 600 }}>{opmlResult.skipped}</span>
                      <span style={{ color: "var(--muted)" }}>개 건너뜀 (이미 존재)</span>
                    </div>
                  )}
                  {opmlResult.errors.length > 0 && (
                    <div className="mt-2">
                      {opmlResult.errors.map((err, i) => (
                        <div key={i} className="text-[11px] text-[var(--danger)]">{err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {opmlError && <p className="text-[11px] text-[var(--danger)] font-medium">{opmlError}</p>}

              {/* Separator */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

              {/* Export section */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">OPML 내보내기</label>
                <button
                  onClick={handleOpmlExport}
                  className="w-full border border-[var(--border)] py-2.5 text-[12px] font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  style={{ borderRadius: 0, background: "var(--background)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  OPML 내보내기
                </button>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-[11px] font-medium metal-btn text-[var(--muted)]" style={{ borderRadius: 0 }}>
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
