import { useCallback } from "react";
import { createHabitLog, getHabitLogsByHabitId } from "@/db";
import { diffInDays, todayLocalDate } from "@/utils";
import type { HabitLog, HabitStats } from "@/types";

export function useHabitLogs() {
  const addLog = useCallback(
    async (data: Omit<HabitLog, "id">): Promise<HabitLog> => createHabitLog(data),
    [],
  );

  const getLogsByHabit = useCallback(
    async (habitId: string): Promise<HabitLog[]> => getHabitLogsByHabitId(habitId),
    [],
  );

  const getStats = useCallback(async (habitId: string): Promise<HabitStats> => {
    const logs = await getHabitLogsByHabitId(habitId);
    const EVENT_ORDER: Record<string, number> = { relapse: 0, start: 1 };
    const sorted = [...logs].sort((a, b) => {
      const dateDiff = a.eventDate.localeCompare(b.eventDate);
      if (dateDiff !== 0) return dateDiff;
      return (EVENT_ORDER[a.eventType] ?? 0) - (EVENT_ORDER[b.eventType] ?? 0);
    });
    const today = todayLocalDate();

    let currentStreak = 0;
    let longestStreak = 0;
    let totalRelapses = 0;
    const streaks: number[] = [];
    let streakStart: string | null = null;
    let startDate = "";

    for (const log of sorted) {
      if (log.eventType === "start") {
        streakStart = log.eventDate.slice(0, 10);
        if (!startDate) startDate = streakStart;
      } else {
        if (!startDate) continue;
        totalRelapses++;
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

    return { currentStreak, longestStreak, totalRelapses, averageStreak, startDate };
  }, []);

  return { addLog, getLogsByHabit, getStats };
}
