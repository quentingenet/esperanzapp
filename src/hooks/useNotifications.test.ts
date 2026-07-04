import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotifications, getNotificationId, NOTIF_DOMAIN_OFFSET } from "./useNotifications";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(LocalNotifications.schedule).mockClear();
    vi.mocked(LocalNotifications.cancel).mockClear();
    vi.mocked(LocalNotifications.getPending).mockClear();
    vi.mocked(LocalNotifications.requestPermissions).mockClear();
    vi.mocked(LocalNotifications.checkPermissions).mockClear();
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

  it("scheduleReminder uses ScheduleOn {hour, minute} for daily treatment", async () => {
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
            schedule: expect.objectContaining({ on: expect.objectContaining({ hour: 8, minute: 0 }) }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses ScheduleOn {weekday} for weekly treatment", async () => {
    const weekly: Treatment = { ...treatment, frequency: "weekly", reminderDay: 1 }; // Monday
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(weekly);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            schedule: expect.objectContaining({ on: expect.objectContaining({ weekday: 2, hour: 8, minute: 0 }) }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses ScheduleOn {day} for monthly treatment", async () => {
    const monthly: Treatment = { ...treatment, frequency: "monthly", reminderDay: 15 };
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(monthly);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            schedule: expect.objectContaining({ on: expect.objectContaining({ day: 15, hour: 8, minute: 0 }) }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses ScheduleOn {day: 28} for monthly last day of month", async () => {
    const lastDay: Treatment = { ...treatment, frequency: "monthly", reminderDay: 0 };
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(lastDay);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            schedule: expect.objectContaining({ on: expect.objectContaining({ day: 28, hour: 8, minute: 0 }) }),
          }),
        ]),
      }),
    );
  });

  it("cancelReminder calls cancel with namespaced treatment id", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.cancelReminder("3");
    });
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: TREATMENT_3_NOTIF_ID }],
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

  it("scheduleReminder returns 'scheduled' when permission is granted", async () => {
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
});
