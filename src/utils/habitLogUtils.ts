import type { HabitLog } from "@/types";

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
