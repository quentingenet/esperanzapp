import { format } from "date-fns";
import type { Locale } from "date-fns";

export function weekDayLabel(day: number, locale: Locale): string {
  return format(new Date(2024, 0, 7 + day), "EEEE", { locale });
}

export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

export const MONTH_DAYS: { value: number; key: string }[] = [
  { value: 1, key: "firstDay" },
  ...Array.from({ length: 27 }, (_, i) => ({ value: i + 2, key: String(i + 2) })),
  { value: 0, key: "lastDay" },
];
