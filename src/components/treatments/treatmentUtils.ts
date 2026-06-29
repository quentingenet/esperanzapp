import { format } from "date-fns";
import type { Locale } from "date-fns";

export function weekDayLabel(day: number, locale: Locale): string {
  return format(new Date(2024, 0, 7 + day), "EEEE", { locale });
}
