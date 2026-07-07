import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { getDaysInMonth } from "date-fns";
import { useNotifications, getNotificationId, getLastDayNotificationIds, NOTIF_DOMAIN_OFFSET } from "./useNotifications";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { ExactAlarm } from "@/plugins/ExactAlarm";
import type { Treatment } from "@/types";

const treatment: Treatment = {
  id: "3",
  label: "Metformin",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T10:00:00.000Z",
};

const TREATMENT_3_NOTIF_ID = getNotificationId("treatments", "3");

describe("getNotificationId", () => {
  it("returns different IDs for different domains with same id", () => {
    expect(getNotificationId("treatments", "1")).not.toBe(getNotificationId("milestones", "1"));
  });

  it("treatment IDs are in [1_000_000, 2_000_000)", () => {
    expect(getNotificationId("treatments", "abc")).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.treatments);
    expect(getNotificationId("treatments", "abc")).toBeLessThan(NOTIF_DOMAIN_OFFSET.milestones);
  });

  it("milestone IDs are in [2_000_000, 3_000_000)", () => {
    expect(getNotificationId("milestones", "abc")).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.milestones);
    expect(getNotificationId("milestones", "abc")).toBeLessThan(3_000_000);
  });

  it("is deterministic for the same input", () => {
    expect(getNotificationId("treatments", "my-id")).toBe(getNotificationId("treatments", "my-id"));
  });

  it("produces no collisions across 50 sequential treatment IDs", () => {
    const ids = Array.from({ length: 50 }, (_, i) => getNotificationId("treatments", String(i + 1)));
    const unique = new Set(ids);
    expect(unique.size).toBe(50);
  });

  it("stays within the treatments domain for imported numeric IDs >= 1_000_000", () => {
    const id = getNotificationId("treatments", "1000000");
    expect(id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.treatments);
    expect(id).toBeLessThan(NOTIF_DOMAIN_OFFSET.milestones);
  });

  it("base IDs are in [offset+1, offset+499_999] and last-day IDs are in [offset+500_000, offset+999_999]", () => {
    const baseId = getNotificationId("treatments", "42");
    const lastDayIds = getLastDayNotificationIds("42");
    const LO = NOTIF_DOMAIN_OFFSET.treatments;
    expect(baseId).toBeGreaterThanOrEqual(LO + 1);
    expect(baseId).toBeLessThan(LO + 500_000);
    for (const id of lastDayIds) {
      expect(id).toBeGreaterThanOrEqual(LO + 500_000);
      expect(id).toBeLessThan(LO + 1_000_000);
    }
    expect(lastDayIds).not.toContain(baseId);
  });
});

describe("useNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
    vi.mocked(LocalNotifications.schedule).mockClear();
    vi.mocked(LocalNotifications.cancel).mockClear();
    vi.mocked(LocalNotifications.getPending).mockClear();
    vi.mocked(LocalNotifications.requestPermissions).mockClear();
    vi.mocked(LocalNotifications.checkPermissions).mockClear();
    vi.mocked(ExactAlarm.canScheduleExactAlarms).mockClear();
    vi.mocked(ExactAlarm.requestExactAlarmPermission).mockClear();
  });

  it("requestPermission returns true when granted", async () => {
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValueOnce({ display: "granted" });
    const { result } = renderHook(() => useNotifications());
    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });
    expect(granted).toBe(true);
  });

  it("requestPermission returns false when denied", async () => {
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValueOnce({ display: "denied" });
    const { result } = renderHook(() => useNotifications());
    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });
    expect(granted).toBe(false);
  });

  it("scheduleReminder uses ScheduleOn {hour, minute} with allowWhileIdle for daily treatment", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(treatment);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: TREATMENT_3_NOTIF_ID,
            title: "EsperanzApp",
            schedule: expect.objectContaining({ on: expect.objectContaining({ hour: 8, minute: 0 }), allowWhileIdle: true }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses ScheduleOn {weekday} with allowWhileIdle for weekly treatment", async () => {
    const weekly: Treatment = { ...treatment, frequency: "weekly", reminderDay: 1 }; // Monday
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(weekly);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            schedule: expect.objectContaining({ on: expect.objectContaining({ weekday: 2, hour: 8, minute: 0 }), allowWhileIdle: true }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses ScheduleOn {day} with allowWhileIdle for monthly treatment", async () => {
    const monthly: Treatment = { ...treatment, frequency: "monthly", reminderDay: 15 };
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(monthly);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            schedule: expect.objectContaining({ on: expect.objectContaining({ day: 15, hour: 8, minute: 0 }), allowWhileIdle: true }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder schedules 12 one-shot notifications for reminderDay=0 (last day of month)", async () => {
    // System time: Jan 15 2024 06:00 UTC → Jan 31 is in the future, start from month 0
    const lastDay: Treatment = { ...treatment, frequency: "monthly", reminderDay: 0 };
    const lastDayIds = getLastDayNotificationIds(lastDay.id);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: lastDayIds.map((id) => ({ id })),
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(lastDay);
    });
    const call = vi.mocked(LocalNotifications.schedule).mock.calls[0]!;
    const notifications = call[0].notifications;
    expect(notifications).toHaveLength(12);
    for (const notif of notifications) {
      expect(notif.schedule?.at).toBeInstanceOf(Date);
      expect(notif.schedule?.on).toBeUndefined();
      expect(notif.schedule?.allowWhileIdle).toBe(true);
      expect(notif.schedule?.at!.getDate()).toBe(getDaysInMonth(notif.schedule!.at!));
      expect(notif.schedule?.at!.getHours()).toBe(8);
    }
  });

  it("each of the 12 last-day occurrences falls on the last day of its respective month", async () => {
    vi.setSystemTime(new Date("2024-01-15T06:00:00.000Z"));
    const lastDay: Treatment = { ...treatment, frequency: "monthly", reminderDay: 0 };
    const lastDayIds = getLastDayNotificationIds(lastDay.id);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: lastDayIds.map((id) => ({ id })),
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(lastDay);
    });
    const call = vi.mocked(LocalNotifications.schedule).mock.calls[0]!;
    const dates = call[0].notifications.map((n) => n.schedule?.at as Date);
    for (const d of dates) {
      expect(d.getDate()).toBe(getDaysInMonth(d));
    }
    // All 12 must be in the future
    const now = new Date();
    for (const d of dates) {
      expect(d.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("last-day notification IDs are unique and stay within the treatment domain", () => {
    const ids = getLastDayNotificationIds("42");
    expect(new Set(ids).size).toBe(12);
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.treatments);
      expect(id).toBeLessThan(NOTIF_DOMAIN_OFFSET.milestones);
    }
  });

  it("scheduleReminder skips months in the past and starts from the next future last-day", async () => {
    // Jan 31 09:00 UTC, reminderTime 08:00 → Jan 31 08:00 is past → first slot is Feb 2024
    vi.setSystemTime(new Date("2024-01-31T09:00:00.000Z"));
    const lastDay: Treatment = { ...treatment, frequency: "monthly", reminderDay: 0 };
    const lastDayIds = getLastDayNotificationIds(lastDay.id);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: lastDayIds.map((id) => ({ id })),
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(lastDay);
    });
    const call = vi.mocked(LocalNotifications.schedule).mock.calls[0]!;
    const dates = call[0].notifications.map((n) => n.schedule?.at as Date);
    expect(dates).toHaveLength(12);
    const now = new Date();
    for (const d of dates) {
      expect(d.getTime()).toBeGreaterThan(now.getTime());
      expect(d.getDate()).toBe(getDaysInMonth(d));
    }
  });

  it("cancelReminder cancels the base ID and all 12 last-day IDs in one call", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.cancelReminder("3");
    });
    const lastDayIds = getLastDayNotificationIds("3");
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: TREATMENT_3_NOTIF_ID }, ...lastDayIds.map((id) => ({ id }))],
    });
  });

  it("rescheduleAll schedules treatments before cancelling orphans", async () => {
    // Verifies the non-destructive order: schedule first, then purge stale IDs.
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    const notifId = getNotificationId("treatments", treatment.id);
    const orphanId = NOTIF_DOMAIN_OFFSET.treatments + 999;
    vi.mocked(LocalNotifications.getPending)
      // First call: scheduleReminder verify — notifId found → "scheduled"
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult)
      // Second call: orphan check — notifId expected, orphanId is stale
      .mockResolvedValueOnce({ notifications: [{ id: notifId }, { id: orphanId }] } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    // Schedule must happen before cancel of orphans
    const scheduleCalls = vi.mocked(LocalNotifications.schedule).mock.invocationCallOrder[0]!;
    const cancelCalls = vi.mocked(LocalNotifications.cancel).mock.invocationCallOrder;
    const orphanCancelOrder = cancelCalls[cancelCalls.length - 1]!;
    expect(scheduleCalls).toBeLessThan(orphanCancelOrder);
    // Only the orphan is cancelled (pre-cancel + orphan cancel = 2 cancel calls total)
    expect(LocalNotifications.cancel).toHaveBeenLastCalledWith(
      expect.objectContaining({ notifications: [{ id: orphanId }] }),
    );
  });

  it("rescheduleAll does NOT cancel out-of-domain IDs as orphans", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    const notifId = getNotificationId("treatments", treatment.id);
    const outsideDomain = 42;
    vi.mocked(LocalNotifications.getPending)
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult)
      .mockResolvedValueOnce({ notifications: [{ id: notifId }, { id: outsideDomain }] } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    // notifId is expected so no orphan cancel; outsideDomain is out of treatment domain so also skipped.
    // Only the pre-cancel inside scheduleReminder fires — no second cancel call.
    expect(LocalNotifications.cancel).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAll skips orphan-cancel when no stale IDs exist", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    const notifId = getNotificationId("treatments", treatment.id);
    vi.mocked(LocalNotifications.getPending)
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult)
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    // Only 1 cancel call: the pre-cancel inside scheduleReminder; no orphan cancel
    expect(LocalNotifications.cancel).toHaveBeenCalledTimes(1);
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAll returns false when there are no treatments to schedule", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({ notifications: [] } satisfies PendingResult);
    const { result } = renderHook(() => useNotifications());
    let anyFailed: boolean | undefined;
    await act(async () => {
      anyFailed = await result.current.rescheduleAll([]);
    });
    expect(anyFailed).toBe(false);
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("rescheduleAll returns true when any treatment scheduling fails", async () => {
    // Default getPending returns [] → scheduleReminder verify finds nothing → "schedule-failed"
    const { result } = renderHook(() => useNotifications());
    let anyFailed: boolean | undefined;
    await act(async () => {
      anyFailed = await result.current.rescheduleAll([treatment]);
    });
    expect(anyFailed).toBe(true);
  });

  it("rescheduleAll returns false when all treatments schedule successfully", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    const notifId = getNotificationId("treatments", treatment.id);
    vi.mocked(LocalNotifications.getPending)
      // scheduleReminder verify → notifId found → "scheduled"
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult)
      // orphan check → only notifId pending, which is expected → no orphans
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    let anyFailed: boolean | undefined;
    await act(async () => {
      anyFailed = await result.current.rescheduleAll([treatment]);
    });
    expect(anyFailed).toBe(false);
  });

  it("scheduleReminder returns 'schedule-failed' when notification not found in pending and exact alarm is granted", async () => {
    // Simulates a scheduling failure not caused by the exact-alarm permission.
    // getPending returns empty even though schedule() did not throw and canScheduleExactAlarms returns true.
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({ notifications: [] } satisfies PendingResult);
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("schedule-failed");
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
  });

  it("scheduleReminder returns 'exact-alarm-denied' when notification not found in pending and exact alarm is not granted", async () => {
    // Simulates Android 14+ silent failure when SCHEDULE_EXACT_ALARM is revoked.
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({ notifications: [] } satisfies PendingResult);
    vi.mocked(ExactAlarm.canScheduleExactAlarms).mockResolvedValueOnce({ value: false });
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("exact-alarm-denied");
  });

  it("scheduleReminder returns 'unverified' when getPending throws after scheduling", async () => {
    vi.mocked(LocalNotifications.getPending).mockRejectedValueOnce(new Error("ipc failure"));
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("unverified");
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
  });

  it("scheduleReminder returns 'scheduled' when permission is granted", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: TREATMENT_3_NOTIF_ID }],
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("scheduled");
  });

  it("scheduleReminder returns 'permission-denied' when permission is denied", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValueOnce({ display: "denied" });
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("permission-denied");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("scheduleReminder returns 'disabled' when reminderEnabled is false", async () => {
    const disabled: Treatment = { ...treatment, reminderEnabled: false };
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(disabled);
    });
    expect(status).toBe("disabled");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("scheduleReminder returns 'schedule-failed' for monthly treatment with reminderDay=null", async () => {
    const bad: Treatment = { ...treatment, frequency: "monthly", reminderDay: null };
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(bad);
    });
    expect(status).toBe("schedule-failed");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("scheduleReminder returns 'schedule-failed' when reminderTime is out of range", async () => {
    const bad: Treatment = { ...treatment, reminderTime: "99:99" };
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(bad);
    });
    expect(status).toBe("schedule-failed");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("scheduleReminder returns 'schedule-failed' when reminderTime is invalid", async () => {
    const bad: Treatment = { ...treatment, reminderTime: "invalid" };
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(bad);
    });
    expect(status).toBe("schedule-failed");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("scheduleReminder returns 'disabled' on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("disabled");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("requestPermission returns false on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { result } = renderHook(() => useNotifications());
    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });
    expect(granted).toBe(false);
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();
  });

  it("getPermissionStatus returns true when permission is granted", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValueOnce({ display: "granted" });
    const { result } = renderHook(() => useNotifications());
    let status: boolean | null | undefined;
    await act(async () => {
      status = await result.current.getPermissionStatus();
    });
    expect(status).toBe(true);
  });

  it("getPermissionStatus returns false when permission is denied", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValueOnce({ display: "denied" });
    const { result } = renderHook(() => useNotifications());
    let status: boolean | null | undefined;
    await act(async () => {
      status = await result.current.getPermissionStatus();
    });
    expect(status).toBe(false);
  });

  it("getPermissionStatus returns null on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { result } = renderHook(() => useNotifications());
    let status: boolean | null | undefined;
    await act(async () => {
      status = await result.current.getPermissionStatus();
    });
    expect(status).toBeNull();
    expect(LocalNotifications.checkPermissions).not.toHaveBeenCalled();
  });

  it("getExactAlarmStatus returns true when canScheduleExactAlarms resolves true on Android", async () => {
    vi.mocked(ExactAlarm.canScheduleExactAlarms).mockResolvedValueOnce({ value: true });
    const { result } = renderHook(() => useNotifications());
    let status: boolean | undefined;
    await act(async () => {
      status = await result.current.getExactAlarmStatus();
    });
    expect(status).toBe(true);
    expect(ExactAlarm.canScheduleExactAlarms).toHaveBeenCalledTimes(1);
  });

  it("getExactAlarmStatus returns false when canScheduleExactAlarms resolves false on Android", async () => {
    vi.mocked(ExactAlarm.canScheduleExactAlarms).mockResolvedValueOnce({ value: false });
    const { result } = renderHook(() => useNotifications());
    let status: boolean | undefined;
    await act(async () => {
      status = await result.current.getExactAlarmStatus();
    });
    expect(status).toBe(false);
  });

  it("getExactAlarmStatus returns true without calling plugin on non-Android platform", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    const { result } = renderHook(() => useNotifications());
    let status: boolean | undefined;
    await act(async () => {
      status = await result.current.getExactAlarmStatus();
    });
    expect(status).toBe(true);
    expect(ExactAlarm.canScheduleExactAlarms).not.toHaveBeenCalled();
  });

  it("openExactAlarmSettings calls requestExactAlarmPermission on Android", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.openExactAlarmSettings();
    });
    expect(ExactAlarm.requestExactAlarmPermission).toHaveBeenCalledTimes(1);
  });

  it("openExactAlarmSettings does nothing on non-Android platform", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.openExactAlarmSettings();
    });
    expect(ExactAlarm.requestExactAlarmPermission).not.toHaveBeenCalled();
  });
});
