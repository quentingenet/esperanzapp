import type { DayStatus, HabitLog, TreatmentLog, TreatmentStatus } from "@/types";
import { todayLocalDate } from "./dates";

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function fillActiveDays(
  map: Record<string, DayStatus>,
  fromDate: string,
  toDate: string,
): void {
  let cursor = addDays(fromDate, 1);
  while (cursor < toDate) {
    map[cursor] = "active";
    cursor = addDays(cursor, 1);
  }
}

export function buildDayStatusMap(
  logs: HabitLog[],
  today = todayLocalDate(),
): Record<string, DayStatus> {
  const map: Record<string, DayStatus> = {};
  const sorted = [...logs].sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    if (!log) continue;
    const dateKey = log.eventDate.slice(0, 10);

    if (log.eventType === "start") {
      map[dateKey] = "start";
      const nextDate = sorted[i + 1]?.eventDate.slice(0, 10) ?? addDays(today, 1);
      fillActiveDays(map, dateKey, nextDate);
    } else {
      map[dateKey] = "relapse";
    }
  }

  return map;
}

export function buildTreatmentStatusMap(
  logs: TreatmentLog[],
): Record<string, TreatmentStatus> {
  const map: Record<string, TreatmentStatus> = {};
  for (const log of logs) {
    map[log.scheduledAt] = log.status;
  }
  return map;
}
