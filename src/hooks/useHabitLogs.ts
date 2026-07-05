import { useCallback } from "react";
import { createHabitLog, getHabitLogsByHabitId, getAllHabitLogs, recordHabitRelapse } from "@/db";
import { diffInDays, todayLocalDate } from "@/utils";
import type { HabitLog, HabitStats } from "@/types";

const EVENT_ORDER: Record<string, number> = { relapse: 0, start: 1 };

function computeStats(logs: HabitLog[]): HabitStats {
  const today = todayLocalDate();
  const sorted = [...logs].sort((a, b) => {
    const dateDiff = a.eventDate.localeCompare(b.eventDate);
    if (dateDiff !== 0) return dateDiff;
    return (EVENT_ORDER[a.eventType] ?? 0) - (EVENT_ORDER[b.eventType] ?? 0);
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let totalRelapses = 0;
  const streaks: number[] = [];
  let streakStart: string | null = null;
  let startDate = "";
  let lastRelapseDate: string | null = null;

  for (const log of sorted) {
    if (log.eventType === "start") {
      if (!startDate) startDate = log.eventDate.slice(0, 10);
      if (!streakStart) streakStart = log.eventDate.slice(0, 10);
    } else {
      if (!startDate) continue;
      totalRelapses++;
      lastRelapseDate = log.eventDate.slice(0, 10);
      if (streakStart) {
        const days = diffInDays(streakStart, log.eventDate.slice(0, 10));
        streaks.push(days);
        if (days > longestStreak) longestStreak = days;
      }
      streakStart = null;
    }
  }

  if (streakStart) {
    currentStreak = Math.max(0, diffInDays(streakStart, today));
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    streaks.push(currentStreak);
  }

  const averageStreak =
    streaks.length > 0
      ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
      : 0;

  return { currentStreak, longestStreak, totalRelapses, averageStreak, startDate, lastRelapseDate, currentStreakStart: streakStart };
}

export function useHabitLogs() {
  const addLog = useCallback(
    async (data: Omit<HabitLog, "id">): Promise<HabitLog> => createHabitLog(data),
    [],
  );

  const getLogsByHabit = useCallback(
    async (habitId: string): Promise<HabitLog[]> => getHabitLogsByHabitId(habitId),
    [],
  );

  const getStats = useCallback(
    async (habitId: string): Promise<HabitStats> => {
      const logs = await getHabitLogsByHabitId(habitId);
      return computeStats(logs);
    },
    [],
  );

  const getStatsBatch = useCallback(
    async (habitIds: string[]): Promise<Record<string, HabitStats>> => {
      const allLogs = await getAllHabitLogs();
      const grouped = new Map<string, HabitLog[]>(habitIds.map((id) => [id, []]));
      for (const log of allLogs) {
        const group = grouped.get(log.habitId);
        if (group) group.push(log);
      }
      const result: Record<string, HabitStats> = {};
      for (const [id, logs] of grouped) {
        result[id] = computeStats(logs);
      }
      return result;
    },
    [],
  );

  const recordRelapse = useCallback(
    async (habitId: string, eventDate: string): Promise<void> =>
      recordHabitRelapse(habitId, eventDate),
    [],
  );

  return { addLog, recordRelapse, getLogsByHabit, getStats, getStatsBatch };
}
