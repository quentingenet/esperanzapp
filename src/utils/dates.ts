import { differenceInCalendarDays, format, parseISO } from "date-fns";

export function diffInDays(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to.slice(0, 10)), parseISO(from.slice(0, 10)));
}

export function todayLocalDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}
