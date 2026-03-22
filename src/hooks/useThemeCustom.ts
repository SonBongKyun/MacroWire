"use client";

import { useState, useEffect, useCallback } from "react";

export interface ThemePreset {
  id: string;
  name: string;
  colors: {
    accent: string;
    accentLight: string;
    gold: string;
    background: string;
    surface: string;
    foreground: string;
    border: string;
  };
}

const PRESETS: ThemePreset[] = [
  {
    id: "ink-gold",
    name: "Ink & Gold",
    colors: {
      accent: "#1e3a5f",
      accentLight: "#2d5a8e",
      gold: "#c49a2c",
      background: "#f7f7f5",
      surface: "#ffffff",
      foreground: "#2c2c34",
      border: "#e4e4e0",
    },
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    colors: {
      accent: "#1a56db",
      accentLight: "#3b82f6",
      gold: "#f59e0b",
      background: "#f0f4ff",
      surface: "#ffffff",
      foreground: "#1e293b",
      border: "#dbeafe",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    colors: {
      accent: "#047857",
      accentLight: "#059669",
      gold: "#d97706",
      background: "#f0fdf4",
      surface: "#ffffff",
      foreground: "#1a2e1a",
      border: "#d1fae5",
    },
  },
  {
    id: "rose",
    name: "Rose",
    colors: {
      accent: "#be123c",
      accentLight: "#e11d48",
      gold: "#c2410c",
      background: "#fff1f2",
      surface: "#ffffff",
      foreground: "#2a1215",
      border: "#fecdd3",
    },
  },
  {
    id: "mono",
    name: "Monochrome",
    colors: {
      accent: "#374151",
      accentLight: "#4b5563",
      gold: "#78716c",
      background: "#f9fafb",
      surface: "#ffffff",
      foreground: "#111827",
      border: "#e5e7eb",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      accent: "#9a3412",
      accentLight: "#c2410c",
      gold: "#b45309",
      background: "#fffbeb",
      surface: "#ffffff",
      foreground: "#292524",
      border: "#fed7aa",
    },
  },
];

const STORAGE_KEY = "macro-wire-theme-preset";

export function useThemeCustom() {
  const [activeTheme, setActiveTheme] = useState<string>("ink-gold");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveTheme(stored);
      applyTheme(stored);
    }
  }, []);

  const applyTheme = useCallback((themeId: string) => {
    const preset = PRESETS.find((p) => p.id === themeId);
    if (!preset) return;

    const root = document.documentElement;
    const isDark = root.classList.contains("dark");

    if (!isDark) {
      root.style.setProperty("--accent", preset.colors.accent);
      root.style.setProperty("--accent-light", preset.colors.accentLight);
      root.style.setProperty("--gold", preset.colors.gold);
      root.style.setProperty("--gold-light", preset.colors.gold);
      root.style.setProperty("--background", preset.colors.background);
      root.style.setProperty("--surface", preset.colors.surface);
      root.style.setProperty("--foreground", preset.colors.foreground);
      root.style.setProperty("--border", preset.colors.border);
      root.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${preset.colors.accent} 0%, ${preset.colors.accentLight} 100%)`);
      root.style.setProperty("--accent-surface", `rgba(${hexToRgb(preset.colors.accent)}, 0.04)`);
      root.style.setProperty("--accent-glow", `rgba(${hexToRgb(preset.colors.accent)}, 0.07)`);
      root.style.setProperty("--gold-surface", `rgba(${hexToRgb(preset.colors.gold)}, 0.06)`);
      root.style.setProperty("--shadow-accent", `0 4px 18px -3px rgba(${hexToRgb(preset.colors.accent)}, 0.18)`);
      root.style.setProperty("--shadow-gold", `0 4px 18px -3px rgba(${hexToRgb(preset.colors.gold)}, 0.2)`);
      root.style.setProperty("--border-accent", `rgba(${hexToRgb(preset.colors.accent)}, 0.18)`);
    }
  }, []);

  const selectTheme = useCallback((themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
    applyTheme(themeId);
  }, [applyTheme]);

  const resetTheme = useCallback(() => {
    setActiveTheme("ink-gold");
    localStorage.removeItem(STORAGE_KEY);
    // Remove all custom properties
    const root = document.documentElement;
    const props = ["--accent", "--accent-light", "--gold", "--gold-light", "--background", "--surface", "--foreground", "--border", "--accent-gradient", "--accent-surface", "--accent-glow", "--gold-surface", "--shadow-accent", "--shadow-gold", "--border-accent"];
    props.forEach((p) => root.style.removeProperty(p));
  }, []);

  return { activeTheme, presets: PRESETS, selectTheme, resetTheme };
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
