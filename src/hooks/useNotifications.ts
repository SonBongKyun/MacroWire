"use client";

import { useState, useEffect, useCallback } from "react";

export interface NotificationRule {
  id: string;
  type: "keyword" | "tag" | "source";
  value: string;
  enabled: boolean;
  createdAt: string;
}

export interface NotificationStore {
  rules: NotificationRule[];
  enabled: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = "ryzm-finance-notifications";

function load(): NotificationStore {
  if (typeof window === "undefined") return { rules: [], enabled: true, soundEnabled: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { rules: [], enabled: true, soundEnabled: false };
}

function persist(store: NotificationStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useNotifications() {
  const [store, setStore] = useState<NotificationStore>({ rules: [], enabled: true, soundEnabled: false });

  useEffect(() => {
    setStore(load());
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const addRule = useCallback((type: NotificationRule["type"], value: string) => {
    setStore((prev) => {
      if (prev.rules.some((r) => r.type === type && r.value === value)) return prev;
      const rule: NotificationRule = {
        id: `${type}-${value}-${Date.now()}`,
        type,
        value,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      const next = { ...prev, rules: [...prev.rules, rule] };
      persist(next);
      return next;
    });
  }, []);

  const removeRule = useCallback((id: string) => {
    setStore((prev) => {
      const next = { ...prev, rules: prev.rules.filter((r) => r.id !== id) };
      persist(next);
      return next;
    });
  }, []);

  const toggleRule = useCallback((id: string) => {
    setStore((prev) => {
      const next = {
        ...prev,
        rules: prev.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
      };
      persist(next);
      return next;
    });
  }, []);

  const toggleGlobal = useCallback(() => {
    setStore((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      persist(next);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setStore((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      persist(next);
      return next;
    });
  }, []);

  const checkArticle = useCallback(
    (article: { title: string; tags: string[]; sourceName: string }) => {
      if (!store.enabled) return false;
      const activeRules = store.rules.filter((r) => r.enabled);
      return activeRules.some((rule) => {
        switch (rule.type) {
          case "keyword":
            return article.title.toLowerCase().includes(rule.value.toLowerCase());
          case "tag":
            return article.tags.includes(rule.value);
          case "source":
            return article.sourceName === rule.value;
          default:
            return false;
        }
      });
    },
    [store.enabled, store.rules]
  );

  const sendNotification = useCallback(
    (title: string, body: string) => {
      if (!store.enabled) return;
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      new Notification(title, {
        body,
        icon: "/icon.svg",
        tag: `ryzm-finance-alert-${Date.now()}`,
      });

      if (store.soundEnabled) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.1;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
      }
    },
    [store.enabled, store.soundEnabled]
  );

  return {
    store,
    requestPermission,
    addRule,
    removeRule,
    toggleRule,
    toggleGlobal,
    toggleSound,
    checkArticle,
    sendNotification,
  };
}
