import { describe, it, expect } from "vitest";
import { POSITIVE_HABIT_TYPES, getPositiveHabitTypeConfig } from "./positiveHabitTypes";

describe("POSITIVE_HABIT_TYPES", () => {
  it("contains exactly the expected preset ids, in order, with custom last", () => {
    expect(POSITIVE_HABIT_TYPES.map((h) => h.id)).toEqual([
      "sport",
      "reading",
      "meditation",
      "tidying",
      "healthyEating",
      "custom",
    ]);
  });

  it("does not contain the retired hydration/sleep presets", () => {
    const ids = POSITIVE_HABIT_TYPES.map((h) => h.id);
    expect(ids).not.toContain("hydration");
    expect(ids).not.toContain("sleep");
  });

  it("every preset has a non-empty svgPath, color and bgColor", () => {
    for (const h of POSITIVE_HABIT_TYPES) {
      expect(h.svgPath.length).toBeGreaterThan(0);
      expect(h.color).toMatch(/^#/);
      expect(h.bgColor).toMatch(/^#/);
    }
  });

  it("custom is the only entry in the 'custom' group; the rest are 'activities'", () => {
    const custom = POSITIVE_HABIT_TYPES.filter((h) => h.group === "custom");
    expect(custom.map((h) => h.id)).toEqual(["custom"]);
    const activities = POSITIVE_HABIT_TYPES.filter((h) => h.group === "activities");
    expect(activities).toHaveLength(POSITIVE_HABIT_TYPES.length - 1);
  });

  it("getPositiveHabitTypeConfig resolves tidying and healthyEating", () => {
    expect(getPositiveHabitTypeConfig("tidying")?.id).toBe("tidying");
    expect(getPositiveHabitTypeConfig("healthyEating")?.id).toBe("healthyEating");
  });
});
