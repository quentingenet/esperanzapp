import { describe, it, expect } from "vitest";
import { GRADES, getGrade, getNextGrade, getProgressToNext } from "./grades";

describe("GRADES", () => {
  it("contains 9 entries", () => {
    expect(GRADES).toHaveLength(9);
  });

  it("is sorted by days ascending", () => {
    for (let i = 1; i < GRADES.length; i++) {
      expect(GRADES[i]!.days).toBeGreaterThan(GRADES[i - 1]!.days);
    }
  });

  it("starts at day 1 and ends at day 730", () => {
    expect(GRADES[0].days).toBe(1);
    expect(GRADES[GRADES.length - 1]!.days).toBe(730);
  });

  it("every entry has all required fields", () => {
    for (const grade of GRADES) {
      expect(grade.days).toBeGreaterThan(0);
      expect(grade.labelKey.length).toBeGreaterThan(0);
      expect(grade.emoji.length).toBeGreaterThan(0);
      expect(grade.messageKey.length).toBeGreaterThan(0);
    }
  });
});

describe("getGrade", () => {
  it("returns first grade for day 0", () => {
    expect(getGrade(0)).toBe(GRADES[0]);
  });

  it("returns awakening at day 1", () => {
    expect(getGrade(1)).toBe(GRADES[0]);
  });

  it("returns awakening at day 6 (below firstBreath threshold)", () => {
    expect(getGrade(6)).toBe(GRADES[0]);
  });

  it("returns firstBreath at day 7", () => {
    expect(getGrade(7)).toBe(GRADES[1]);
  });

  it("returns anchoring at day 14", () => {
    expect(getGrade(14)).toBe(GRADES[2]);
  });

  it("returns solidity at day 30", () => {
    expect(getGrade(30)).toBe(GRADES[3]);
  });

  it("returns clarity at day 60", () => {
    expect(getGrade(4)).toBe(GRADES[0]);
    expect(getGrade(60)).toBe(GRADES[4]);
  });

  it("returns mastery at day 90", () => {
    expect(getGrade(90)).toBe(GRADES[5]);
  });

  it("returns freedom at day 180", () => {
    expect(getGrade(180)).toBe(GRADES[6]);
  });

  it("returns fulfilledAwakening at day 365", () => {
    expect(getGrade(365)).toBe(GRADES[7]);
  });

  it("returns legend at day 730", () => {
    expect(getGrade(730)).toBe(GRADES[8]);
  });

  it("returns legend for days beyond 730", () => {
    expect(getGrade(1000)).toBe(GRADES[8]);
    expect(getGrade(9999)).toBe(GRADES[8]);
  });
});

describe("getNextGrade", () => {
  it("returns awakening as next when days = 0", () => {
    const result = getNextGrade(0);
    expect(result).not.toBeNull();
    expect(result?.grade).toBe(GRADES[0]);
    expect(result?.daysLeft).toBe(1);
  });

  it("returns firstBreath as next when at awakening (day 1)", () => {
    const result = getNextGrade(1);
    expect(result?.grade).toBe(GRADES[1]);
    expect(result?.daysLeft).toBe(6);
  });

  it("returns correct daysLeft mid-streak", () => {
    const result = getNextGrade(4);
    expect(result?.grade).toBe(GRADES[1]);
    expect(result?.daysLeft).toBe(3);
  });

  it("returns legend as next when at fulfilledAwakening", () => {
    const result = getNextGrade(365);
    expect(result?.grade).toBe(GRADES[8]);
    expect(result?.daysLeft).toBe(365);
  });

  it("returns null when at or beyond legend (730+)", () => {
    expect(getNextGrade(730)).toBeNull();
    expect(getNextGrade(999)).toBeNull();
  });
});

describe("getProgressToNext", () => {
  it("returns 0 at day 0 (0 of 1 toward awakening)", () => {
    expect(getProgressToNext(0)).toBe(0);
  });

  it("returns 0 at day 1 (start of awakening → firstBreath)", () => {
    expect(getProgressToNext(1)).toBe(0);
  });

  it("returns 50 at day 4 (halfway between awakening day 1 and firstBreath day 7)", () => {
    expect(getProgressToNext(4)).toBe(50);
  });

  it("returns 0 at day 7 (start of firstBreath → anchoring)", () => {
    expect(getProgressToNext(7)).toBe(0);
  });

  it("returns 0 at each grade threshold", () => {
    expect(getProgressToNext(14)).toBe(0);
    expect(getProgressToNext(30)).toBe(0);
    expect(getProgressToNext(60)).toBe(0);
    expect(getProgressToNext(90)).toBe(0);
    expect(getProgressToNext(180)).toBe(0);
    expect(getProgressToNext(365)).toBe(0);
  });

  it("returns 100 when at legend (730+)", () => {
    expect(getProgressToNext(730)).toBe(100);
    expect(getProgressToNext(1000)).toBe(100);
  });

  it("never returns value outside 0-100", () => {
    for (const days of [0, 1, 5, 13, 29, 59, 89, 179, 364, 729, 730, 9999]) {
      const p = getProgressToNext(days);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});
