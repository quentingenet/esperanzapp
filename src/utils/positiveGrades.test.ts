import { describe, it, expect } from "vitest";
import { POSITIVE_GRADES } from "./positiveGrades";

describe("POSITIVE_GRADES", () => {
  it("is sorted by threshold ascending", () => {
    for (let i = 1; i < POSITIVE_GRADES.length; i++) {
      expect(POSITIVE_GRADES[i]!.threshold).toBeGreaterThan(POSITIVE_GRADES[i - 1]!.threshold);
    }
  });

  it("starts at 1 and ends at 1000", () => {
    expect(POSITIVE_GRADES[0].threshold).toBe(1);
    expect(POSITIVE_GRADES[POSITIVE_GRADES.length - 1]!.threshold).toBe(1000);
  });

  it("every entry has all required fields", () => {
    for (const grade of POSITIVE_GRADES) {
      expect(grade.threshold).toBeGreaterThan(0);
      expect(grade.labelKey.length).toBeGreaterThan(0);
      expect(grade.emoji.length).toBeGreaterThan(0);
      expect(grade.messageKey.length).toBeGreaterThan(0);
      expect(grade.labelKey.startsWith("positiveGrades.")).toBe(true);
      expect(grade.messageKey.startsWith("positiveGrades.messages.")).toBe(true);
    }
  });

  it("i18n keys never collide with GRADES (distinct namespace)", () => {
    for (const grade of POSITIVE_GRADES) {
      expect(grade.labelKey.startsWith("grades.")).toBe(false);
    }
  });
});
