"use client";

import { useEffect } from "react";

interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: "탐색", items: [
    { keys: ["j"], desc: "다음 기사" },
    { keys: ["k"], desc: "이전 기사" },
    { keys: ["g"], desc: "맨 위로 이동" },
    { keys: ["o"], desc: "원문 열기" },
  ]},
  { section: "검색·필터", items: [
    { keys: ["/"], desc: "검색창 포커스" },
    { keys: ["⌘", "K"], desc: "검색창 포커스" },
    { keys: ["1"], desc: "범위: 24H" },
    { keys: ["2"], desc: "범위: 7D" },
    { keys: ["3"], desc: "범위: 30D" },
  ]},
  { section: "동작", items: [
    { keys: ["s"], desc: "저장 토글" },
    { keys: ["r"], desc: "읽음 토글 / 새로고침" },
    { keys: ["d"], desc: "다크모드 토글" },
    { keys: ["m"], desc: "전체 읽음 처리" },
    { keys: ["e"], desc: "저장된 기사 내보내기" },
    { keys: ["?"], desc: "이 도움말 표시/닫기" },
  ]},
];

export function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-[480px] max-h-[70vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] metal-surface animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] metal-header">
          <h3 className="text-[13px] font-bold text-[var(--foreground-bright)]">
            ⌨️ 키보드 단축키
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts */}
        <div className="p-5 space-y-5">
          {SHORTCUTS.map(({ section, items }) => (
            <div key={section}>
              <h4 className="text-[12px] uppercase tracking-[0.08em] text-[var(--muted)] font-semibold mb-2.5">
                {section}
              </h4>
              <div className="space-y-1.5">
                {items.map(({ keys, desc }) => (
                  <div key={desc} className="flex items-center justify-between py-1">
                    <span className="text-[12px] text-[var(--foreground)]">{desc}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-[var(--muted)] text-[11px] mx-0.5">/</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-semibold text-[var(--foreground-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] metal-btn">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] text-center">
          <span className="text-[12px] text-[var(--muted)]">
            <kbd className="inline-flex items-center justify-center w-[18px] h-[18px] px-1 text-[11px] font-semibold border border-[var(--border)] rounded-[3px] metal-btn mr-1">?</kbd>
            또는
            <kbd className="inline-flex items-center justify-center min-w-[30px] h-[18px] px-1.5 text-[11px] font-semibold border border-[var(--border)] rounded-[3px] metal-btn mx-1">Esc</kbd>
            로 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
