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
    { keys: ["⌘", "K"], desc: "커맨드 팔레트 열기" },
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
  { section: "UI 전환", items: [
    { keys: ["["], desc: "사이드바 접기/펼치기" },
    { keys: ["f"], desc: "포커스 리딩 모드" },
    { keys: ["v"], desc: "리스트/카드 뷰 전환" },
    { keys: ["a"], desc: "애널리틱스 대시보드" },
    { keys: ["w"], desc: "키워드 워치리스트" },
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
        className="relative w-[480px] max-h-[70vh] overflow-y-auto rounded-[var(--radius-lg)] glass-modal rotating-border animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] glass-header">
          <h3 className="text-[13px] font-extrabold text-[var(--foreground-bright)] flex items-center gap-2 tracking-tight">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
            </svg>
            키보드 단축키
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts */}
        <div className="p-5 space-y-5">
          {SHORTCUTS.map(({ section, items }) => (
            <div key={section}>
              <h4 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-2.5">
                {section}
              </h4>
              <div className="space-y-1">
                {items.map(({ keys, desc }) => (
                  <div key={desc} className="flex items-center justify-between py-1.5 px-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors">
                    <span className="text-[12px] text-[var(--foreground)]">{desc}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-[var(--muted)] text-[10px] mx-0.5">+</span>}
                          <kbd className="kbd-key text-[var(--foreground-secondary)] bg-[var(--surface-active)] border border-[var(--border)]">
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
        <div className="px-5 py-3 border-t border-[var(--border)] text-center glass-header">
          <span className="text-[10px] text-[var(--muted)]">
            <kbd className="kbd-key text-[var(--foreground-secondary)] bg-[var(--surface-active)] border border-[var(--border)] !min-w-[18px] !h-[18px] text-[9px] mr-1">?</kbd>
            또는
            <kbd className="kbd-key text-[var(--foreground-secondary)] bg-[var(--surface-active)] border border-[var(--border)] !min-w-[30px] !h-[18px] text-[9px] mx-1">Esc</kbd>
            로 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
