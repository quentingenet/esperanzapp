import { describe, it, expect } from "vitest";
import { toNotificationExtra, parseNotificationExtra } from "./notificationDeepLink";

describe("toNotificationExtra / parseNotificationExtra", () => {
  it("round-trips a valid deep link", () => {
    const link = { kind: "treatment", entityId: "42" } as const;
    expect(parseNotificationExtra(toNotificationExtra(link))).toEqual(link);
  });

  it("round-trips each known kind", () => {
    for (const kind of ["treatment", "habit", "positiveHabit"] as const) {
      const link = { kind, entityId: "7" };
      expect(parseNotificationExtra(toNotificationExtra(link))).toEqual(link);
    }
  });

  it("returns null for undefined extra (notification scheduled before this feature existed)", () => {
    expect(parseNotificationExtra(undefined)).toBeNull();
  });

  it("returns null for null extra", () => {
    expect(parseNotificationExtra(null)).toBeNull();
  });

  it("returns null for a non-object extra", () => {
    expect(parseNotificationExtra("treatment")).toBeNull();
    expect(parseNotificationExtra(42)).toBeNull();
  });

  it("returns null when kind is unknown", () => {
    expect(parseNotificationExtra({ kind: "unknown", entityId: "1" })).toBeNull();
  });

  it("returns null when kind is missing", () => {
    expect(parseNotificationExtra({ entityId: "1" })).toBeNull();
  });

  it("returns null when entityId is missing or not a string", () => {
    expect(parseNotificationExtra({ kind: "treatment" })).toBeNull();
    expect(parseNotificationExtra({ kind: "treatment", entityId: 1 })).toBeNull();
  });

  it("returns null when entityId is an empty string", () => {
    expect(parseNotificationExtra({ kind: "treatment", entityId: "" })).toBeNull();
  });
});
