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

  it("rescheduleAll cancels treatment-domain pending notifications then reschedules", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    const inDomain1 = NOTIF_DOMAIN_OFFSET.treatments + 1;
    const inDomain2 = NOTIF_DOMAIN_OFFSET.treatments + 500;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: inDomain1 }, { id: inDomain2 }],
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    expect(LocalNotifications.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ notifications: [{ id: inDomain1 }, { id: inDomain2 }] }),
    );
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAll does NOT cancel notifications outside the treatment domain", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    const outsideDomain = 42; // not in treatment domain
    const inDomain = NOTIF_DOMAIN_OFFSET.treatments + 1;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: outsideDomain }, { id: inDomain }],
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    expect(LocalNotifications.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ notifications: [{ id: inDomain }] }),
    );
    expect(LocalNotifications.cancel).not.toHaveBeenCalledWith(
      expect.objectContaining({ notifications: expect.arrayContaining([{ id: outsideDomain }]) }),
    );
  });

  it("rescheduleAll skips bulk-cancel when no treatment-domain notifications are pending", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: 42 }], // outside treatment domain
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    // Only the pre-cancel inside scheduleReminder fires (1 call), bulk-cancel is skipped
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

  it("rescheduleAll returns true when any treatment scheduling fails with error", async () => {
    // Default getPending returns [] so scheduleReminder verification step finds nothing and returns "error"
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
      .mockResolvedValueOnce({ notifications: [] } satisfies PendingResult)
      .mockResolvedValueOnce({ notifications: [{ id: notifId }] } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    let anyFailed: boolean | undefined;
    await act(async () => {
      anyFailed = await result.current.rescheduleAll([treatment]);
    });
    expect(anyFailed).toBe(false);
  });

  it("scheduleReminder returns 'error' when getPending does not find the notification after scheduling", async () => {
    // Simulates Android 14+ silent failure when SCHEDULE_EXACT_ALARM is not granted.
    // getPending returns empty even though schedule() did not throw.
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({ notifications: [] } satisfies PendingResult);
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(treatment);
    });
    expect(status).toBe("error");
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

  it("scheduleReminder returns 'error' when reminderTime is out of range", async () => {
    const bad: Treatment = { ...treatment, reminderTime: "99:99" };
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(bad);
    });
    expect(status).toBe("error");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("scheduleReminder returns 'error' when reminderTime is invalid", async () => {
    const bad: Treatment = { ...treatment, reminderTime: "invalid" };
    const { result } = renderHook(() => useNotifications());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.scheduleReminder(bad);
    });
    expect(status).toBe("error");
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
