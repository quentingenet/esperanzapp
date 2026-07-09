import type { TreatmentLog, TreatmentStatus } from "@/types";

export function buildTreatmentStatusMap(logs: TreatmentLog[]): Record<string, TreatmentStatus> {
  const map: Record<string, TreatmentStatus> = {};
  for (const log of logs) {
    map[log.scheduledAt.slice(0, 10)] = log.status;
  }
  return map;
}
