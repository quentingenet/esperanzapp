import { describe, it, expect } from "vitest";
import { diffInDays } from "./dates";

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

  it("ignores time and timezone component in ISO datetime strings", () => {
    expect(diffInDays("2024-01-01T00:00:00.000Z", "2024-01-08T23:59:59.000Z")).toBe(7);
  });

  it("produces the same result for date-only and datetime inputs on the same day", () => {
    expect(diffInDays("2024-06-01", "2024-06-15")).toBe(
      diffInDays("2024-06-01T10:30:00.000Z", "2024-06-15T22:45:00.000Z"),
    );
  });
});
