"use client";

import type { ThemePreset } from "@/hooks/useThemeCustom";

interface ThemeSelectorProps {
  activeTheme: string;
  presets: ThemePreset[];
  onSelect: (id: string) => void;
  onReset: () => void;
}

export function ThemeSelector({ activeTheme, presets, onSelect, onReset }: ThemeSelectorProps) {
  return (
    <div className="glass-modal w-72 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-[var(--foreground-bright)] flex items-center gap-2">
          <div className="w-5 h-5 rounded-[var(--radius-xs)] bg-gradient-to-br from-[var(--accent)] to-[var(--gold)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          테마
        </h3>
        {activeTheme !== "ink-gold" && (
          <button
            onClick={onReset}
            className="text-[9px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors font-medium"
          >
            초기화
          </button>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={`relative p-3 rounded-[var(--radius-md)] border transition-all text-left ${
              activeTheme === preset.id
                ? "border-[var(--accent)] bg-[var(--accent-surface)] shadow-sm"
                : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {activeTheme === preset.id && (
              <div className="absolute top-1.5 right-1.5">
                <svg className="w-3 h-3 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            )}
            {/* Color preview */}
            <div className="flex gap-1 mb-2">
              <div className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.colors.accent }} />
              <div className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.colors.gold }} />
              <div className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.colors.background }} />
            </div>
            <div className="text-[10px] font-bold text-[var(--foreground)]">{preset.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
