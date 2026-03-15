"use client";

import { useState, useEffect, useCallback } from "react";

export interface CollectionStore {
  /** articleId → collectionName */
  assignments: Record<string, string>;
  /** All collection names */
  names: string[];
}

const STORAGE_KEY = "macro-wire-collections";

function load(): CollectionStore {
  if (typeof window === "undefined") return { assignments: {}, names: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { assignments: {}, names: [] };
}

function persist(store: CollectionStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useCollections() {
  const [store, setStore] = useState<CollectionStore>({
    assignments: {},
    names: [],
  });

  useEffect(() => {
    setStore(load());
  }, []);

  const assignArticle = useCallback(
    (articleId: string, collectionName: string) => {
      setStore((prev) => {
        const next = {
          ...prev,
          assignments: { ...prev.assignments, [articleId]: collectionName },
        };
        if (collectionName && !next.names.includes(collectionName)) {
          next.names = [...next.names, collectionName];
        }
        persist(next);
        return next;
      });
    },
    []
  );

  const unassignArticle = useCallback((articleId: string) => {
    setStore((prev) => {
      const assignments = { ...prev.assignments };
      delete assignments[articleId];
      const next = { ...prev, assignments };
      persist(next);
      return next;
    });
  }, []);

  const createCollection = useCallback((name: string) => {
    setStore((prev) => {
      if (prev.names.includes(name)) return prev;
      const next = { ...prev, names: [...prev.names, name] };
      persist(next);
      return next;
    });
  }, []);

  const deleteCollection = useCallback((name: string) => {
    setStore((prev) => {
      const next = {
        assignments: Object.fromEntries(
          Object.entries(prev.assignments).filter(([, v]) => v !== name)
        ),
        names: prev.names.filter((n) => n !== name),
      };
      persist(next);
      return next;
    });
  }, []);

  const getCollection = useCallback(
    (articleId: string): string => store.assignments[articleId] || "",
    [store.assignments]
  );

  return {
    store,
    assignArticle,
    unassignArticle,
    createCollection,
    deleteCollection,
    getCollection,
  };
}
