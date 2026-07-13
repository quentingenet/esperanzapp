import { useCallback } from "react";
import { getTreatmentLogsByTreatmentId, getPositiveHabitLogsByPositiveHabitId } from "@/db";
import { buildTreatmentStatusMap } from "@/utils";
import type { TreatmentStatus } from "@/types";

export function useCalendar() {
  const getTreatmentStatusMap = useCallback(
    async (treatmentId: string): Promise<Record<string, TreatmentStatus>> => {
      const logs = await getTreatmentLogsByTreatmentId(treatmentId);
      return buildTreatmentStatusMap(logs);
    },
    [],
  );

  const getPositiveHabitStatusMap = useCallback(
    async (positiveHabitId: string): Promise<Record<string, TreatmentStatus>> => {
      const logs = await getPositiveHabitLogsByPositiveHabitId(positiveHabitId);
      return buildTreatmentStatusMap(logs);
    },
    [],
  );

  return { getTreatmentStatusMap, getPositiveHabitStatusMap };
}
