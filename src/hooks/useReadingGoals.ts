"use client";

import { useState, useEffect, useCallback } from "react";

export interface ReadingGoal {
  dailyTarget: number;
  weeklyTarget: number;
}

export interface ReadingProgress {
  todayRead: number;
  weekRead: number;
  streak: number;
  lastReadDate: string;
}

const STORAGE_KEY = "ryzm-finance-reading-progress";

interface StoredData {
  goal: ReadingGoal;
  progress: ReadingProgress;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday as start of week
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function load(): StoredData {
  if (typeof window === "undefined") {
    return {
      goal: { dailyTarget: 10, weeklyTarget: 50 },
      progress: { todayRead: 0, weekRead: 0, streak: 0, lastReadDate: "" },
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: StoredData = JSON.parse(raw);
      const today = getToday();
      const weekStart = getWeekStart();

      // Reset daily count if it's a new day
      if (data.progress.lastReadDate !== today) {
        // Check if streak should continue (yesterday was the last read date)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (data.progress.lastReadDate === yesterdayStr) {
          // Check if daily goal was met yesterday
          if (data.progress.todayRead >= data.goal.dailyTarget) {
            data.progress.streak += 1;
          } else {
            data.progress.streak = 0;
          }
        } else if (data.progress.lastReadDate !== today) {
          // More than one day gap - reset streak
          data.progress.streak = 0;
        }

        data.progress.todayRead = 0;
      }

      // Reset weekly count if new week
      const storedWeekStart = (() => {
        if (!data.progress.lastReadDate) return "";
        const d = new Date(data.progress.lastReadDate);
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diff);
        return d.toISOString().slice(0, 10);
      })();

      if (storedWeekStart !== weekStart) {
        data.progress.weekRead = 0;
      }

      return data;
    }
  } catch {}
  return {
    goal: { dailyTarget: 10, weeklyTarget: 50 },
    progress: { todayRead: 0, weekRead: 0, streak: 0, lastReadDate: "" },
  };
}

function persist(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useReadingGoals() {
  const [goal, setGoalState] = useState<ReadingGoal>({ dailyTarget: 10, weeklyTarget: 50 });
  const [progress, setProgress] = useState<ReadingProgress>({
    todayRead: 0,
    weekRead: 0,
    streak: 0,
    lastReadDate: "",
  });

  useEffect(() => {
    const data = load();
    setGoalState(data.goal);
    setProgress(data.progress);
  }, []);

  const setGoal = useCallback((newGoal: Partial<ReadingGoal>) => {
    setGoalState((prev) => {
      const next = { ...prev, ...newGoal };
      const data = load();
      data.goal = next;
      persist(data);
      return next;
    });
  }, []);

  const getGoal = useCallback(() => goal, [goal]);

  const getProgress = useCallback(() => progress, [progress]);

  const incrementRead = useCallback(() => {
    setProgress((prev) => {
      const today = getToday();
      const next: ReadingProgress = {
        ...prev,
        todayRead: prev.todayRead + 1,
        weekRead: prev.weekRead + 1,
        lastReadDate: today,
      };
      const data: StoredData = { goal, progress: next };
      persist(data);
      return next;
    });
  }, [goal]);

  const getStreak = useCallback(() => {
    // If today's goal is already met, count today as part of the streak
    if (progress.todayRead >= goal.dailyTarget && progress.lastReadDate === getToday()) {
      return progress.streak + 1;
    }
    return progress.streak;
  }, [progress, goal]);

  return {
    goal,
    progress,
    setGoal,
    getGoal,
    getProgress,
    incrementRead,
    getStreak,
  };
}
