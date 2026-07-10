import { useCallback } from "react";
import { getTreatmentLogsByDate, upsertTreatmentLogForDate } from "@/db";
import type { TreatmentLog, TreatmentStatus } from "@/types";

export function useTreatmentLogs() {
  const logStatusForDate = useCallback(
    async (treatmentId: string, date: string, status: TreatmentStatus): Promise<TreatmentLog> => {
      return upsertTreatmentLogForDate(treatmentId, date, status);
    },
    [],
  );

  const getLogsByDate = useCallback(
    async (date: string): Promise<TreatmentLog[]> => getTreatmentLogsByDate(date),
    [],
  );

  return { logStatusForDate, getLogsByDate };
}
