import { useCallback } from "react";
import { getTreatmentLogsByTreatmentId } from "@/db";
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

  return { getTreatmentStatusMap };
}
