import { useCallback } from "react";
import { getHabitLogsByHabitId, getTreatmentLogsByTreatmentId } from "@/db";
import { buildDayStatusMap, buildTreatmentStatusMap } from "@/utils";
import type { DayStatus, TreatmentStatus } from "@/types";

export function useCalendar() {
  const getHabitDayStatusMap = useCallback(
    async (habitId: string): Promise<Record<string, DayStatus>> => {
      const logs = await getHabitLogsByHabitId(habitId);
      return buildDayStatusMap(logs);
    },
    [],
  );

  const getTreatmentStatusMap = useCallback(
    async (treatmentId: string): Promise<Record<string, TreatmentStatus>> => {
      const logs = await getTreatmentLogsByTreatmentId(treatmentId);
      return buildTreatmentStatusMap(logs);
    },
    [],
  );

  return { getHabitDayStatusMap, getTreatmentStatusMap };
}
