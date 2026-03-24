"use client";

import { useState, useEffect, useCallback } from "react";

export interface DashboardSections {
  marketStrip: boolean;
  topStories: boolean;
  activityChart: boolean;
  marketData: boolean;
  statistics: boolean;
  trending: boolean;
  sentiment: boolean;
  sourceQuality: boolean;
  macroIndicators: boolean;
  calendar: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  sections: DashboardSections;
  createdAt: string;
}

const STORAGE_KEY = "ryzm-finance-layouts";
const ACTIVE_KEY = "ryzm-finance-active-layout";
const MAX_LAYOUTS = 5;

const DEFAULT_SECTIONS: DashboardSections = {
  marketStrip: true,
  topStories: true,
  activityChart: true,
  marketData: true,
  statistics: true,
  trending: true,
  sentiment: true,
  sourceQuality: true,
  macroIndicators: true,
  calendar: true,
};

function loadLayouts(): DashboardLayout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistLayouts(layouts: DashboardLayout[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

function persistActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function useDashboardLayout() {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [currentSections, setCurrentSections] = useState<DashboardSections>(DEFAULT_SECTIONS);

  useEffect(() => {
    const stored = loadLayouts();
    setLayouts(stored);
    const activeId = loadActiveId();
    if (activeId) {
      const active = stored.find((l) => l.id === activeId);
      if (active) {
        setActiveLayoutId(activeId);
        setCurrentSections(active.sections);
      }
    }
  }, []);

  const saveLayout = useCallback(
    (name: string) => {
      const id = `layout-${Date.now()}`;
      const layout: DashboardLayout = {
        id,
        name,
        sections: { ...currentSections },
        createdAt: new Date().toISOString(),
      };
      setLayouts((prev) => {
        const next = [...prev, layout].slice(-MAX_LAYOUTS);
        persistLayouts(next);
        return next;
      });
      setActiveLayoutId(id);
      persistActiveId(id);
      return layout;
    },
    [currentSections]
  );

  const loadLayout = useCallback(
    (id: string) => {
      const layout = layouts.find((l) => l.id === id);
      if (layout) {
        setCurrentSections(layout.sections);
        setActiveLayoutId(id);
        persistActiveId(id);
      }
    },
    [layouts]
  );

  const deleteLayout = useCallback(
    (id: string) => {
      setLayouts((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persistLayouts(next);
        return next;
      });
      if (activeLayoutId === id) {
        setActiveLayoutId(null);
        persistActiveId(null);
        setCurrentSections(DEFAULT_SECTIONS);
      }
    },
    [activeLayoutId]
  );

  const getLayouts = useCallback(() => layouts, [layouts]);

  const getActiveLayout = useCallback(() => {
    if (!activeLayoutId) return null;
    return layouts.find((l) => l.id === activeLayoutId) || null;
  }, [layouts, activeLayoutId]);

  const setActiveLayout = useCallback(
    (id: string | null) => {
      if (!id) {
        setActiveLayoutId(null);
        persistActiveId(null);
        setCurrentSections(DEFAULT_SECTIONS);
        return;
      }
      loadLayout(id);
    },
    [loadLayout]
  );

  const toggleSection = useCallback(
    (key: keyof DashboardSections) => {
      setCurrentSections((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        // If there's an active layout, update it
        if (activeLayoutId) {
          setLayouts((prevLayouts) => {
            const updated = prevLayouts.map((l) =>
              l.id === activeLayoutId ? { ...l, sections: next } : l
            );
            persistLayouts(updated);
            return updated;
          });
        }
        return next;
      });
    },
    [activeLayoutId]
  );

  return {
    layouts,
    activeLayoutId,
    currentSections,
    saveLayout,
    loadLayout,
    deleteLayout,
    getLayouts,
    getActiveLayout,
    setActiveLayout,
    toggleSection,
    setCurrentSections,
  };
}
