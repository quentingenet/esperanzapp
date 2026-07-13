/**
 * Cross-module scenario tests (Niveau 2.5) for the "Faire plus" (positive habits) feature.
 * These trace complete flows by mocking only the platform boundaries (Capacitor,
 * LocalNotifications) and chaining the actual application modules together.
 *
 * Coverage targets:
 *   - Domain isolation in useNotifications: scheduling/purging positiveHabits notifications
 *     never touches treatments-domain (or vice versa) pending notifications — this is the
 *     generalization introduced to share the scheduling engine between the two domains.
 *   - checkAndNotifyPositiveMilestone fires only exactly at POSITIVE_GRADES thresholds
 *     across a realistic sequence of check-ins, never in between.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { useNotifications, NOTIF_DOMAIN_OFFSET, getNotificationId } from "@/hooks/useNotifications";
import { checkAndNotifyPositiveMilestone } from "@/utils/buildMilestoneNotifications";
import type { PositiveHabit, Treatment } from "@/types";

const treatment: Treatment = {
  id: "1",
  label: "Metformin",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T10:00:00.000Z",
};

const positiveHabit: PositiveHabit = {
  id: "1",
  label: "Course à pied",
  icon: "M...",
  color: "#2e7d32",
  bgColor: "#e8f5e9",
  frequency: "daily",
  reminderTime: "07:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T10:00:00.000Z",
};

describe("Scenario: rescheduleAll domain isolation (treatments vs positiveHabits)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("rescheduling positiveHabits does not purge a pending treatments-domain notification", async () => {
    const treatmentNotifId = getNotificationId("treatments", "42"); // orphaned treatment, id "42" not in the list below
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending)
      // scheduleReminder's own verification call for the positive habit
      .mockResolvedValueOnce({
        notifications: [{ id: getNotificationId("positiveHabits", positiveHabit.id) }],
      } as PendingResult)
      // orphan-purge scan: an unrelated treatments-domain id is pending alongside it
      .mockResolvedValueOnce({
        notifications: [
          { id: getNotificationId("positiveHabits", positiveHabit.id) },
          { id: treatmentNotifId },
        ],
      } as PendingResult);

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([positiveHabit], "positiveHabits");
    });

    // The treatments-domain id must never appear in a cancel() call: rescheduleAll("positiveHabits")
    // must only ever consider IDs within its own [3_000_000, 4_000_000) range as orphans.
    const cancelledIds = vi
      .mocked(LocalNotifications.cancel)
      .mock.calls.flatMap((call) => call[0].notifications.map((n) => n.id));
    expect(cancelledIds).not.toContain(treatmentNotifId);
  });

  it("rescheduling treatments does not purge a pending positiveHabits-domain notification", async () => {
    const positiveHabitNotifId = getNotificationId("positiveHabits", "42");
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending)
      .mockResolvedValueOnce({
        notifications: [{ id: getNotificationId("treatments", treatment.id) }],
      } as PendingResult)
      .mockResolvedValueOnce({
        notifications: [
          { id: getNotificationId("treatments", treatment.id) },
          { id: positiveHabitNotifId },
        ],
      } as PendingResult);

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      // Default domain param: exercises the exact call shape used by Treatments.tsx.
      await result.current.rescheduleAll([treatment]);
    });

    const cancelledIds = vi
      .mocked(LocalNotifications.cancel)
      .mock.calls.flatMap((call) => call[0].notifications.map((n) => n.id));
    expect(cancelledIds).not.toContain(positiveHabitNotifId);
  });

  it("deleting a positive habit's reminder cancels only its own domain IDs", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.cancelReminder(positiveHabit.id, "positiveHabits");
    });
    const cancelledIds = vi
      .mocked(LocalNotifications.cancel)
      .mock.calls.flatMap((call) => call[0].notifications.map((n) => n.id));
    for (const id of cancelledIds) {
      expect(id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.positiveHabits);
      expect(id).toBeLessThan(NOTIF_DOMAIN_OFFSET.positiveHabits + 1_000_000);
    }
  });
});

describe("Scenario: positive-habit milestone notifications fire only at POSITIVE_GRADES thresholds", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("fires exactly at counts 1, 3 and 7 across a realistic check-in sequence, and nowhere else", async () => {
    // Simulates 8 consecutive "taken" logs, as BuildHabitsTab would trigger one at a time.
    for (let count = 1; count <= 8; count++) {
      await checkAndNotifyPositiveMilestone(positiveHabit, count);
    }
    const firedTitles = vi
      .mocked(LocalNotifications.schedule)
      .mock.calls.map((call) => call[0].notifications[0]?.title);
    // POSITIVE_GRADES thresholds within [1,8]: 1 (seed), 3 (sprout), 7 (roots).
    expect(firedTitles).toHaveLength(3);
    expect(firedTitles[0]).toContain("🌱");
    expect(firedTitles[1]).toContain("🌿");
    expect(firedTitles[2]).toContain("🌳");
  });
});
