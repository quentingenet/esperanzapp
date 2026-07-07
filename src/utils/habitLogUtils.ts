import type { HabitLog } from "@/types";

// Merges each (relapse, start) pair on the same day into a single "relapseRestart" display entry.
// Invariant: recordHabitRelapse() always writes exactly one relapse + one start in one transaction,
// so in practice there is never more than one relapse per (habitId, eventDate). Corrupt imports
// could produce duplicates; in that case every relapse for that day gets the displayKey (harmless
// extra entries) and every same-day start is filtered out (history may look incomplete).
export function mergeRelapseRestart<T extends HabitLog>(logs: T[]): Array<T & { displayKey?: string }> {
  const relapseKeys = new Set(
    logs.filter((l) => l.eventType === "relapse").map((l) => `${l.habitId}:${l.eventDate}`),
  );
  return logs
    .filter((l) => !(l.eventType === "start" && relapseKeys.has(`${l.habitId}:${l.eventDate}`)))
    .map((l) =>
      l.eventType === "relapse" && relapseKeys.has(`${l.habitId}:${l.eventDate}`)
        ? { ...l, displayKey: "history.relapseRestart" as const }
        : l,
    );
}
