import type { TreatmentStatus } from "@/types";

// Structural: TreatmentLog and PositiveHabitLog both satisfy this shape, so this is
// reused as-is for both domains — no need for a second, duplicated function.
export function buildTreatmentStatusMap(
  logs: { scheduledAt: string; status: TreatmentStatus }[],
): Record<string, TreatmentStatus> {
  const map: Record<string, TreatmentStatus> = {};
  for (const log of logs) {
    map[log.scheduledAt.slice(0, 10)] = log.status;
  }
  return map;
}
