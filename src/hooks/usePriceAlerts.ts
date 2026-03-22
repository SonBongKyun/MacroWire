"use client";

import { useState, useEffect, useCallback } from "react";

export interface PriceAlert {
  id: string;
  symbol: string;
  label: string;
  targetPrice: number;
  direction: "above" | "below";
  active: boolean;
  createdAt: string;
  triggeredAt?: string;
}

const STORAGE_KEY = "ryzm-finance-price-alerts";

function loadAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  const addAlert = useCallback(
    (alert: Omit<PriceAlert, "id" | "createdAt" | "active">) => {
      setAlerts((prev) => {
        const next = [
          ...prev,
          {
            ...alert,
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            active: true,
            createdAt: new Date().toISOString(),
          },
        ];
        persistAlerts(next);
        return next;
      });
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      persistAlerts(next);
      return next;
    });
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a
      );
      persistAlerts(next);
      return next;
    });
  }, []);

  const checkAlerts = useCallback(
    (prices: { symbol: string; price: number }[]): PriceAlert[] => {
      const priceMap = new Map(prices.map((p) => [p.symbol, p.price]));
      const triggered: PriceAlert[] = [];

      setAlerts((prev) => {
        let changed = false;
        const next = prev.map((alert) => {
          if (!alert.active || alert.triggeredAt) return alert;
          const currentPrice = priceMap.get(alert.symbol);
          if (currentPrice === undefined) return alert;

          const isTriggered =
            (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
            (alert.direction === "below" && currentPrice <= alert.targetPrice);

          if (isTriggered) {
            changed = true;
            const updated = {
              ...alert,
              triggeredAt: new Date().toISOString(),
            };
            triggered.push(updated);
            return updated;
          }
          return alert;
        });

        if (changed) {
          persistAlerts(next);
          return next;
        }
        return prev;
      });

      return triggered;
    },
    []
  );

  return { alerts, addAlert, removeAlert, toggleAlert, checkAlerts };
}
