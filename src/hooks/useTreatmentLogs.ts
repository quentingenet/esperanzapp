import { useCallback } from "react";
import { createTreatmentLog, getTreatmentLogsByTreatmentId, upsertTreatmentLogForDate } from "@/db";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import type { TreatmentLog, TreatmentStatus } from "@/types";

export function useTreatmentLogs() {
  const { addLog } = useTreatmentsStore();

  const logStatus = useCallback(
    async (data: Omit<TreatmentLog, "id">): Promise<TreatmentLog> => {
      const created = await createTreatmentLog(data);
      addLog(created);
      return created;
    },
    [addLog],
  );

  const logStatusForDate = useCallback(
    async (treatmentId: string, date: string, status: TreatmentStatus): Promise<void> => {
      const log = await upsertTreatmentLogForDate(treatmentId, date, status);
      addLog(log);
    },
    [addLog],
  );

  const getLogsByTreatment = useCallback(
    async (treatmentId: string): Promise<TreatmentLog[]> =>
      getTreatmentLogsByTreatmentId(treatmentId),
    [],
  );

  return { logStatus, logStatusForDate, getLogsByTreatment };
}
