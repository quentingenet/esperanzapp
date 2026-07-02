import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Locale } from "date-fns";

export function diffInDays(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to.slice(0, 10)), parseISO(from.slice(0, 10)));
}

export function todayLocalDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(date: string, locale: Locale): string {
  return format(parseISO(date), "PPP", { locale });
}

export function toISO(date: Date): string {
  return date.toISOString();
}

export function fromISO(date: string): Date {
  return parseISO(date);
}
