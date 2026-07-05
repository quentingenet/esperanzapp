import { useCallback } from "react";
import { getTreatmentLogsByDate, upsertTreatmentLogForDate } from "@/db";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import type { TreatmentLog, TreatmentStatus } from "@/types";

export function useTreatmentLogs() {
  const upsertLog = useTreatmentsStore((s) => s.upsertLog);

  const logStatus = useCallback(
    async (data: Omit<TreatmentLog, "id">): Promise<TreatmentLog> => {
      const log = await upsertTreatmentLogForDate(data.treatmentId, data.scheduledAt, data.status);
      upsertLog(log);
      return log;
    },
    [upsertLog],
  );

  const logStatusForDate = useCallback(
    async (treatmentId: string, date: string, status: TreatmentStatus): Promise<void> => {
      const log = await upsertTreatmentLogForDate(treatmentId, date, status);
      upsertLog(log);
    },
    [upsertLog],
  );

  const getLogsByDate = useCallback(
    async (date: string): Promise<TreatmentLog[]> => getTreatmentLogsByDate(date),
    [],
  );

  return { logStatus, logStatusForDate, getLogsByDate };
}
