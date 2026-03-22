"use client";

import { useState, useEffect, useCallback } from "react";

export interface ViewTab {
  id: string;
  label: string;
  type: "tag" | "source" | "search" | "saved" | "all";
  value: string;
  color?: string;
}

export interface MultiViewStore {
  tabs: ViewTab[];
  activeTabId: string;
}

const STORAGE_KEY = "macro-wire-multiview";

const DEFAULT_TABS: ViewTab[] = [
  { id: "all", label: "전체", type: "all", value: "", color: "var(--accent)" },
];

function load(): MultiViewStore {
  if (typeof window === "undefined") return { tabs: DEFAULT_TABS, activeTabId: "all" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tabs: DEFAULT_TABS, activeTabId: "all" };
}

function persist(store: MultiViewStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useMultiView() {
  const [store, setStore] = useState<MultiViewStore>({ tabs: DEFAULT_TABS, activeTabId: "all" });

  useEffect(() => {
    setStore(load());
  }, []);

  const addTab = useCallback((tab: Omit<ViewTab, "id">) => {
    setStore((prev) => {
      const id = `tab-${Date.now()}`;
      const newTab = { ...tab, id };
      const next = { tabs: [...prev.tabs, newTab], activeTabId: id };
      persist(next);
      return next;
    });
  }, []);

  const removeTab = useCallback((id: string) => {
    if (id === "all") return;
    setStore((prev) => {
      const next = {
        tabs: prev.tabs.filter((t) => t.id !== id),
        activeTabId: prev.activeTabId === id ? "all" : prev.activeTabId,
      };
      persist(next);
      return next;
    });
  }, []);

  const setActiveTab = useCallback((id: string) => {
    setStore((prev) => {
      const next = { ...prev, activeTabId: id };
      persist(next);
      return next;
    });
  }, []);

  const getActiveTab = useCallback((): ViewTab | undefined => {
    return store.tabs.find((t) => t.id === store.activeTabId);
  }, [store]);

  return { store, addTab, removeTab, setActiveTab, getActiveTab };
}
