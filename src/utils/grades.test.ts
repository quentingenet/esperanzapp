import { describe, it, expect } from "vitest";
import { GRADES, getGrade, getNextGrade, getProgressToNext } from "./grades";

describe("GRADES", () => {
  it("contains 23 entries", () => {
    expect(GRADES).toHaveLength(23);
  });

  it("is sorted by days ascending", () => {
    for (let i = 1; i < GRADES.length; i++) {
      expect(GRADES[i]!.days).toBeGreaterThan(GRADES[i - 1]!.days);
    }
  });

  it("starts at day 1 and ends at day 7300", () => {
    expect(GRADES[0].days).toBe(1);
    expect(GRADES[GRADES.length - 1]!.days).toBe(7300);
  });

  it("every entry has all required fields", () => {
    for (const grade of GRADES) {
      expect(grade.days).toBeGreaterThan(0);
      expect(grade.labelKey.length).toBeGreaterThan(0);
      expect(grade.emoji.length).toBeGreaterThan(0);
      expect(grade.messageKey.length).toBeGreaterThan(0);
    }
  });

  it("contains the expected milestone thresholds", () => {
    const days = GRADES.map((g) => g.days);
    expect(days).toContain(1);
    expect(days).toContain(3);
    expect(days).toContain(7);
    expect(days).toContain(30);
    expect(days).toContain(90);
    expect(days).toContain(180);
    expect(days).toContain(365);
    expect(days).toContain(1000);
    expect(days).toContain(1825);
    expect(days).toContain(3650);
    expect(days).toContain(7300);
  });
});

describe("getGrade", () => {
  it("returns first grade for day 0", () => {
    expect(getGrade(0)).toBe(GRADES[0]);
  });

  it("returns firstStep at day 1", () => {
    const g = getGrade(1);
    expect(g.days).toBe(1);
  });

  it("returns firstStep at day 2 (below alive threshold)", () => {
    expect(getGrade(2)).toBe(getGrade(1));
  });

  it("returns alive at day 3", () => {
    expect(getGrade(3).days).toBe(3);
  });

  it("returns oneWeek at day 7", () => {
    expect(getGrade(7).days).toBe(7);
  });

  it("returns twoWeeks at day 14", () => {
    expect(getGrade(14).days).toBe(14);
  });

  it("returns oneMonth at day 30", () => {
    expect(getGrade(30).days).toBe(30);
  });

  it("returns threeMonths at day 90", () => {
    expect(getGrade(90).days).toBe(90);
  });

  it("returns metamorphosis at day 180", () => {
    expect(getGrade(180).days).toBe(180);
  });

  it("returns oneYear at day 365", () => {
    expect(getGrade(365).days).toBe(365);
  });

  it("returns millennium at day 1000", () => {
    expect(getGrade(1000).days).toBe(1000);
  });

  it("returns fiveYears at day 1825", () => {
    expect(getGrade(1825).days).toBe(1825);
  });

  it("returns tenYears at day 3650", () => {
    expect(getGrade(3650).days).toBe(3650);
  });

  it("returns twentyYears at day 7300 and beyond", () => {
    expect(getGrade(7300).days).toBe(7300);
    expect(getGrade(9999)).toBe(GRADES[GRADES.length - 1]);
  });
});

describe("getNextGrade", () => {
  it("returns firstStep as next when days = 0", () => {
    const result = getNextGrade(0);
    expect(result).not.toBeNull();
    expect(result?.grade.days).toBe(1);
    expect(result?.daysLeft).toBe(1);
  });

  it("returns alive as next when at firstStep (day 1)", () => {
    const result = getNextGrade(1);
    expect(result?.grade.days).toBe(3);
    expect(result?.daysLeft).toBe(2);
  });

  it("returns correct daysLeft mid-streak", () => {
    const result = getNextGrade(4);
    expect(result?.grade.days).toBe(7);
    expect(result?.daysLeft).toBe(3);
  });

  it("returns fiveYears as next when at millennium (day 1000)", () => {
    const result = getNextGrade(1000);
    expect(result?.grade.days).toBe(1825);
    expect(result?.daysLeft).toBe(825);
  });

  it("returns null only at or beyond twentyYears (7300+)", () => {
    expect(getNextGrade(7300)).toBeNull();
    expect(getNextGrade(9999)).toBeNull();
  });
});

describe("getProgressToNext", () => {
  it("returns 0 at day 0 (0 of 1 toward firstStep)", () => {
    expect(getProgressToNext(0)).toBe(0);
  });

  it("returns 0 at day 1 (start of firstStep → alive)", () => {
    expect(getProgressToNext(1)).toBe(0);
  });

  it("returns 50 at day 2 (halfway between firstStep day 1 and alive day 3)", () => {
    expect(getProgressToNext(2)).toBe(50);
  });

  it("returns 0 at each grade threshold", () => {
    for (const grade of GRADES.slice(0, -1)) {
      expect(getProgressToNext(grade.days)).toBe(0);
    }
  });

  it("returns 100 only at or beyond twentyYears (7300+)", () => {
    expect(getProgressToNext(7300)).toBe(100);
    expect(getProgressToNext(9999)).toBe(100);
  });

  it("returns < 100 at millennium (day 1000) since fiveYears comes next", () => {
    expect(getProgressToNext(1000)).toBeLessThan(100);
  });

  it("never returns value outside 0-100", () => {
    const testDays = [0, 1, 2, 5, 13, 29, 59, 89, 179, 364, 729, 999, 1000, 1824, 1825, 3649, 3650, 7299, 7300, 9999];
    for (const days of testDays) {
      const p = getProgressToNext(days);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});
