"use client";

import { useState } from "react";
import type { NotificationRule, NotificationStore } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/EmptyState";

interface NotificationPanelProps {
  store: NotificationStore;
  onAddRule: (type: NotificationRule["type"], value: string) => void;
  onRemoveRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onToggleGlobal: () => void;
  onToggleSound: () => void;
  onRequestPermission: () => Promise<boolean>;
  tags: string[];
  sourceNames: string[];
}

export function NotificationPanel({
  store,
  onAddRule,
  onRemoveRule,
  onToggleRule,
  onToggleGlobal,
  onToggleSound,
  onRequestPermission,
  tags,
  sourceNames,
}: NotificationPanelProps) {
  const [newType, setNewType] = useState<NotificationRule["type"]>("keyword");
  const [newValue, setNewValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    onAddRule(newType, newValue.trim());
    setNewValue("");
    setShowAdd(false);
  };

  const permissionStatus =
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported";

  const typeLabel = { keyword: "키워드", tag: "태그", source: "소스" };
  const typeIcon = {
    keyword: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    tag: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    source: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  };

  return (
    <div className="glass-modal w-80 max-h-[500px] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-[var(--foreground-bright)] flex items-center gap-2">
          <div className="w-5 h-5 rounded-[var(--radius-xs)] bg-[var(--accent)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          알림 설정
        </h3>
        <button
          onClick={onToggleGlobal}
          className={`w-9 h-5 rounded-full transition-all duration-200 relative ${
            store.enabled ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all duration-200 ${
              store.enabled ? "left-[18px]" : "left-[3px]"
            }`}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {permissionStatus !== "granted" && (
          <button
            onClick={onRequestPermission}
            className="w-full px-3 py-2 text-[11px] font-semibold rounded-[var(--radius-sm)] bg-[var(--gold-surface)] border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-white transition-all"
          >
            {permissionStatus === "denied" ? "알림 차단됨 — 브라우저 설정에서 허용" : "브라우저 알림 권한 요청"}
          </button>
        )}

        {/* Sound toggle */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[10px] text-[var(--muted)]">알림 사운드</span>
          <button
            onClick={onToggleSound}
            className={`w-7 h-4 rounded-full transition-all duration-200 relative ${
              store.soundEnabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all duration-200 ${
                store.soundEnabled ? "left-[14px]" : "left-[3px]"
              }`}
            />
          </button>
        </div>

        {/* Rules list */}
        {store.rules.length === 0 ? (
          <EmptyState
            glyph="no-notifications"
            title="알림 규칙이 없습니다"
            description="키워드 · 태그 · 소스별로 알림을 받아볼 수 있습니다."
            compact
          />
        ) : (
          <div className="space-y-1">
            {store.rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors group"
              >
                <span className="text-[var(--muted)]">{typeIcon[rule.type]}</span>
                <span className="text-[10px] font-semibold text-[var(--foreground)] flex-1 truncate">
                  {rule.value}
                </span>
                <span className="text-[8px] text-[var(--muted)] uppercase font-bold tracking-wider">
                  {typeLabel[rule.type]}
                </span>
                <button
                  onClick={() => onToggleRule(rule.id)}
                  className={`w-6 h-3.5 rounded-full transition-all relative ${
                    rule.enabled ? "bg-[var(--success)]" : "bg-[var(--border)]"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full bg-white absolute top-[3px] transition-all ${
                    rule.enabled ? "left-[12px]" : "left-[3px]"
                  }`} />
                </button>
                <button
                  onClick={() => onRemoveRule(rule.id)}
                  className="text-[var(--muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add rule */}
      <div className="border-t border-[var(--border)] p-3">
        {showAdd ? (
          <div className="space-y-2">
            <div className="flex gap-1">
              {(["keyword", "tag", "source"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-[var(--radius-xs)] transition-all ${
                    newType === t
                      ? "bg-[var(--accent)] text-white"
                      : "metal-btn text-[var(--muted)]"
                  }`}
                >
                  {typeLabel[t]}
                </button>
              ))}
            </div>
            {newType === "tag" ? (
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              >
                <option value="">태그 선택...</option>
                {tags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : newType === "source" ? (
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              >
                <option value="">소스 선택...</option>
                {sourceNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="키워드 입력..."
                className="w-full px-2.5 py-1.5 text-[11px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                autoFocus
              />
            )}
            <div className="flex gap-1.5">
              <button onClick={handleAdd} className="flex-1 btn-primary px-2 py-1.5 text-[10px] font-bold">
                추가
              </button>
              <button onClick={() => { setShowAdd(false); setNewValue(""); }} className="metal-btn px-2.5 py-1.5 text-[10px]">
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full metal-btn px-3 py-2 text-[10px] font-semibold text-[var(--accent)] flex items-center justify-center gap-1.5"
          >
            <span>+</span> 알림 규칙 추가
          </button>
        )}
      </div>
    </div>
  );
}
