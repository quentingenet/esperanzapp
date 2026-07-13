import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { checkAndNotifyPositiveMilestone } from "./buildMilestoneNotifications";
import { NOTIF_DOMAIN_OFFSET } from "@/hooks/useNotifications";
import type { PositiveHabit } from "@/types";

const positiveHabit: PositiveHabit = {
  id: "5",
  label: "Course à pied",
  icon: "M...",
  color: "#2e7d32",
  bgColor: "#e8f5e9",
  frequency: "daily",
  reminderTime: "07:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("checkAndNotifyPositiveMilestone", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(LocalNotifications.schedule).mockClear();
    vi.mocked(LocalNotifications.checkPermissions).mockClear();
  });

  it("does nothing on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await checkAndNotifyPositiveMilestone(positiveHabit, 1);
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("fires a notification when count lands exactly on a POSITIVE_GRADES threshold", async () => {
    await checkAndNotifyPositiveMilestone(positiveHabit, 1);
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
    const call = vi.mocked(LocalNotifications.schedule).mock.calls[0]![0];
    expect(call.notifications[0]?.title).toContain("🌱");
  });

  it("does nothing when count does not match any threshold", async () => {
    await checkAndNotifyPositiveMilestone(positiveHabit, 2);
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("does nothing when notification permission is not granted", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "denied" });
    await checkAndNotifyPositiveMilestone(positiveHabit, 1);
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("uses a notification ID within the buildMilestones domain", async () => {
    await checkAndNotifyPositiveMilestone(positiveHabit, 1);
    const call = vi.mocked(LocalNotifications.schedule).mock.calls[0]![0];
    const id = call.notifications[0]?.id ?? 0;
    expect(id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.buildMilestones);
    expect(id).toBeLessThan(NOTIF_DOMAIN_OFFSET.buildMilestones + 1_000_000);
  });
});
