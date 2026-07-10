import { isAfter, isBefore, parseISO, startOfDay, subDays, subMonths, subWeeks } from "date-fns";
import type { Frequency } from "@/types";

export function getPastOccurrences(
  frequency: Frequency,
  reminderDay: number | null,
  createdAt: string,
): Date[] {
  const today = startOfDay(new Date());
  const created = startOfDay(parseISO(createdAt.slice(0, 10)));
  const result: Date[] = [];
  if (isNaN(created.getTime())) return result;

  if (frequency === "weekly" && reminderDay !== null) {
    let current = today;
    let safety = 0;
    while (current.getDay() !== reminderDay && safety < 7) {
      current = subDays(current, 1);
      safety++;
    }
    while (!isBefore(current, created)) {
      result.push(current);
      current = subWeeks(current, 1);
    }
  } else if (frequency === "monthly") {
    const day = reminderDay ?? 1;
    let monthOffset = 0;
    while (monthOffset < 600) {
      const monthBase = subMonths(today, monthOffset);
      let occurrence: Date;
      if (day === 0) {
        occurrence = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0);
      } else {
        const daysInMonth = new Date(
          monthBase.getFullYear(),
          monthBase.getMonth() + 1,
          0,
        ).getDate();
        occurrence = new Date(
          monthBase.getFullYear(),
          monthBase.getMonth(),
          Math.min(day, daysInMonth),
        );
      }
      if (isBefore(startOfDay(occurrence), created)) break;
      if (!isAfter(startOfDay(occurrence), today)) result.push(occurrence);
      monthOffset++;
    }
  }

  return result;
}
