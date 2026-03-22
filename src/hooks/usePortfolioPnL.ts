"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export interface PortfolioPosition {
  symbol: string;
  label: string;
  quantity: number;
  avgCost: number;
  addedAt: string;
}

export interface PositionPnL {
  symbol: string;
  label: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  totalValue: number;
  totalCost: number;
}

const STORAGE_KEY = "ryzm-finance-positions";

function loadPositions(): PortfolioPosition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistPositions(positions: PortfolioPosition[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function usePortfolioPnL() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);

  useEffect(() => {
    setPositions(loadPositions());
  }, []);

  const addPosition = useCallback(
    (position: Omit<PortfolioPosition, "addedAt">) => {
      setPositions((prev) => {
        const existing = prev.find((p) => p.symbol === position.symbol);
        let next: PortfolioPosition[];
        if (existing) {
          // Merge: weighted average cost
          const totalQty = existing.quantity + position.quantity;
          const totalCost =
            existing.quantity * existing.avgCost +
            position.quantity * position.avgCost;
          next = prev.map((p) =>
            p.symbol === position.symbol
              ? { ...p, quantity: totalQty, avgCost: totalCost / totalQty }
              : p
          );
        } else {
          next = [
            ...prev,
            { ...position, addedAt: new Date().toISOString() },
          ];
        }
        persistPositions(next);
        return next;
      });
    },
    []
  );

  const removePosition = useCallback((symbol: string) => {
    setPositions((prev) => {
      const next = prev.filter((p) => p.symbol !== symbol);
      persistPositions(next);
      return next;
    });
  }, []);

  const updatePosition = useCallback(
    (symbol: string, updates: Partial<Pick<PortfolioPosition, "quantity" | "avgCost">>) => {
      setPositions((prev) => {
        const next = prev.map((p) =>
          p.symbol === symbol ? { ...p, ...updates } : p
        );
        persistPositions(next);
        return next;
      });
    },
    []
  );

  const computePnL = useCallback(
    (prices: { symbol: string; price: number }[]): {
      items: PositionPnL[];
      totalValue: number;
      totalCost: number;
      totalPnL: number;
      totalReturnPct: number;
    } => {
      const priceMap = new Map(prices.map((p) => [p.symbol, p.price]));

      const items: PositionPnL[] = positions.map((pos) => {
        const currentPrice = priceMap.get(pos.symbol) ?? 0;
        const totalValue = currentPrice * pos.quantity;
        const totalCost = pos.avgCost * pos.quantity;
        const pnl = totalValue - totalCost;
        const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
        return {
          symbol: pos.symbol,
          label: pos.label,
          quantity: pos.quantity,
          avgCost: pos.avgCost,
          currentPrice,
          pnl,
          pnlPct,
          totalValue,
          totalCost,
        };
      });

      const totalValue = items.reduce((s, i) => s + i.totalValue, 0);
      const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
      const totalPnL = totalValue - totalCost;
      const totalReturnPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

      return { items, totalValue, totalCost, totalPnL, totalReturnPct };
    },
    [positions]
  );

  return { positions, addPosition, removePosition, updatePosition, computePnL };
}
