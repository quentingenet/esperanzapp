import { describe, it, expect } from "vitest";
import { NOTIF_DOMAIN_OFFSET } from "@/hooks/useNotifications";
import { resolveNotificationTarget } from "./resolveNotificationTarget";
import { toNotificationExtra } from "./notificationDeepLink";

describe("resolveNotificationTarget", () => {
  it("routes a treatment notification to the treatments tab", () => {
    expect(resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.treatments + 1 })).toEqual({
      activeTab: "treatments",
      deepLink: undefined,
    });
  });

  it("routes a habit-streak milestone notification to home/reduce", () => {
    expect(resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.milestones + 1 })).toEqual({
      activeTab: "home",
      subTab: "reduce",
      deepLink: undefined,
    });
  });

  it("routes a positive-habit reminder notification to home/build", () => {
    expect(resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.positiveHabits + 1 })).toEqual({
      activeTab: "home",
      subTab: "build",
      deepLink: undefined,
    });
  });

  it("routes a build-milestone notification to home/build", () => {
    expect(resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.buildMilestones + 1 })).toEqual({
      activeTab: "home",
      subTab: "build",
      deepLink: undefined,
    });
  });

  it("returns null for an ID below the treatments domain", () => {
    expect(resolveNotificationTarget({ id: 42 })).toBeNull();
  });

  it("carries a valid deep link through for the matching domain", () => {
    const extra = toNotificationExtra({ kind: "treatment", entityId: "7" });
    expect(resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.treatments + 1, extra })).toEqual({
      activeTab: "treatments",
      deepLink: { kind: "treatment", entityId: "7" },
    });
  });

  it("drops a malformed extra payload instead of throwing", () => {
    expect(
      resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.treatments + 1, extra: { bogus: true } }),
    ).toEqual({ activeTab: "treatments", deepLink: undefined });
  });

  it("has no deep link when extra is absent (notification scheduled before this feature)", () => {
    const target = resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.milestones + 1 });
    expect(target?.deepLink).toBeUndefined();
  });

  it("omits the deepLink key entirely rather than setting it to undefined", () => {
    const target = resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.treatments + 1 });
    expect(target).not.toBeNull();
    expect("deepLink" in (target as object)).toBe(false);
  });

  it("drops a deep link whose kind does not match the notification's ID range", () => {
    // ID falls in the treatments range, but the payload claims to be a positive habit — a
    // corrupted/malformed `extra`, or a future scheduling bug attaching the wrong kind.
    const extra = toNotificationExtra({ kind: "positiveHabit", entityId: "5" });
    const target = resolveNotificationTarget({ id: NOTIF_DOMAIN_OFFSET.treatments + 1, extra });
    expect(target).toEqual({ activeTab: "treatments" });
    expect("deepLink" in (target as object)).toBe(false);
  });
});
