import { describe, it, expect, vi, afterEach } from "vitest";
import { getPastOccurrences } from "./treatmentCalendarUtils";
import { format } from "date-fns";

afterEach(() => { vi.useRealTimers(); });

function fmt(d: Date) { return format(d, "yyyy-MM-dd"); }

describe("getPastOccurrences", () => {
  it("returns empty array for daily frequency (caller handles daily separately)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
    expect(getPastOccurrences("daily", null, "2024-01-01T00:00:00Z")).toHaveLength(0);
  });

  it("weekly: returns all past occurrences on the correct weekday back to createdAt", () => {
    // 2024-01-15 is a Monday (getDay()=1)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    const result = getPastOccurrences("weekly", 1, "2024-01-01T00:00:00Z");
    expect(result.map(fmt)).toEqual(["2024-01-15", "2024-01-08", "2024-01-01"]);
  });

  it("weekly: stops at createdAt (does not include days before it)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    const result = getPastOccurrences("weekly", 1, "2024-01-09T00:00:00Z");
    expect(result.map(fmt)).toEqual(["2024-01-15"]);
  });

  it("weekly: first occurrence is the latest past weekday (backtrack from today)", () => {
    // 2024-01-15 is Monday; reminderDay=3 (Wednesday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    const result = getPastOccurrences("weekly", 3, "2024-01-01T00:00:00Z");
    // Most recent past Wednesday from Jan 15 is Jan 10
    expect(fmt(result[0]!)).toBe("2024-01-10");
    expect(result.every((d) => d.getDay() === 3)).toBe(true);
  });

  it("monthly: returns occurrences on the specified day back to createdAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-20T12:00:00Z"));
    const result = getPastOccurrences("monthly", 10, "2024-01-15T00:00:00Z");
    expect(result.map(fmt)).toEqual(["2024-03-10", "2024-02-10"]);
  });

  it("monthly: skips the current month occurrence when it is in the future", () => {
    // Today = March 5; day=10 → March 10 is in the future, not included
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-05T12:00:00Z"));
    const result = getPastOccurrences("monthly", 10, "2024-01-01T00:00:00Z");
    expect(fmt(result[0]!)).toBe("2024-02-10");
  });

  it("monthly: caps day to last day of short months", () => {
    // reminderDay=31; February has 29 days in 2024 (leap year)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-31T12:00:00Z"));
    const result = getPastOccurrences("monthly", 31, "2024-02-01T00:00:00Z");
    expect(result.map(fmt)).toEqual(["2024-03-31", "2024-02-29"]);
  });

  it("monthly reminderDay=0: returns last day of each month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-20T12:00:00Z"));
    const result = getPastOccurrences("monthly", 0, "2024-01-15T00:00:00Z");
    // March 31 > today (Mar 20) → skipped; Feb 29 (leap) and Jan 31 included
    expect(result.map(fmt)).toEqual(["2024-02-29", "2024-01-31"]);
  });

  it("returns empty array when createdAt is today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
    const result = getPastOccurrences("monthly", 15, "2024-03-15T00:00:00Z");
    expect(result.map(fmt)).toEqual(["2024-03-15"]);
  });
});
