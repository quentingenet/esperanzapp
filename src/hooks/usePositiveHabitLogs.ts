import { useCallback } from "react";
import {
  getPositiveHabitLogsByDate,
  getPositiveHabitTakenCount,
  upsertPositiveHabitLogForDate,
} from "@/db";
import type { PositiveHabitLog, TreatmentStatus } from "@/types";

export function usePositiveHabitLogs() {
  const logStatusForDate = useCallback(
    async (
      positiveHabitId: string,
      date: string,
      status: TreatmentStatus,
    ): Promise<PositiveHabitLog> => {
      return upsertPositiveHabitLogForDate(positiveHabitId, date, status);
    },
    [],
  );

  const getLogsByDate = useCallback(
    async (date: string): Promise<PositiveHabitLog[]> => getPositiveHabitLogsByDate(date),
    [],
  );

  const getTakenCount = useCallback(
    async (positiveHabitId: string): Promise<number> => getPositiveHabitTakenCount(positiveHabitId),
    [],
  );

  return { logStatusForDate, getLogsByDate, getTakenCount };
}
