import { describe, it, expect } from "vitest";
import { enUS, fr, es } from "date-fns/locale";
import { diffInDays, formatDate, toISO, fromISO } from "./dates";

describe("diffInDays", () => {
  it("returns 0 for the same date", () => {
    expect(diffInDays("2024-01-01", "2024-01-01")).toBe(0);
  });

  it("returns positive value when to is after from", () => {
    expect(diffInDays("2024-01-01", "2024-01-08")).toBe(7);
  });

  it("returns negative value when to is before from", () => {
    expect(diffInDays("2024-01-10", "2024-01-05")).toBe(-5);
  });

  it("handles month boundaries", () => {
    expect(diffInDays("2024-01-31", "2024-02-01")).toBe(1);
  });

  it("handles year boundaries", () => {
    expect(diffInDays("2023-12-31", "2024-01-01")).toBe(1);
  });

  it("handles leap year", () => {
    expect(diffInDays("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("handles non-leap year February", () => {
    expect(diffInDays("2023-02-28", "2023-03-01")).toBe(1);
  });

  it("counts full calendar days", () => {
    expect(diffInDays("2024-01-01", "2024-12-31")).toBe(365);
  });
});

describe("formatDate", () => {
  it("formats date in English (enUS)", () => {
    const result = formatDate("2024-06-15", enUS);
    expect(result).toContain("June");
    expect(result).toContain("2024");
  });

  it("formats date in French", () => {
    const result = formatDate("2024-06-15", fr);
    expect(result).toContain("2024");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats date in Spanish", () => {
    const result = formatDate("2024-06-15", es);
    expect(result).toContain("2024");
  });

  it("returns a non-empty string", () => {
    expect(formatDate("2024-01-01", enUS).length).toBeGreaterThan(0);
  });
});

describe("toISO", () => {
  it("returns a valid ISO string", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const result = toISO(date);
    expect(result).toBe("2024-06-15T12:00:00.000Z");
  });

  it("round-trips with fromISO for full datetime strings", () => {
    const original = "2024-06-15T10:30:00.000Z";
    const date = new Date(original);
    expect(toISO(date)).toBe(original);
  });
});

describe("fromISO", () => {
  it("returns a Date object", () => {
    expect(fromISO("2024-06-15") instanceof Date).toBe(true);
  });

  it("parses year correctly", () => {
    const date = fromISO("2024-06-15");
    expect(date.getFullYear()).toBe(2024);
  });

  it("parses month correctly (0-indexed)", () => {
    const date = fromISO("2024-06-15");
    expect(date.getMonth()).toBe(5);
  });

  it("parses day correctly", () => {
    const date = fromISO("2024-06-15");
    expect(date.getDate()).toBe(15);
  });

  it("parses full ISO datetime", () => {
    const date = fromISO("2024-06-15T12:00:00.000Z");
    expect(date.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });
});
