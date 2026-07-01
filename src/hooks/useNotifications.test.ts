import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "./useNotifications";
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

  it("scheduleReminder calls LocalNotifications.schedule with correct id and frequency", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(treatment);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: 3,
            title: "EsperanzApp",
            schedule: expect.objectContaining({ every: "day", repeats: true }),
          }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses 'week' for weekly treatment", async () => {
    const weekly: Treatment = { ...treatment, frequency: "weekly" };
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(weekly);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({ schedule: expect.objectContaining({ every: "week" }) }),
        ]),
      }),
    );
  });

  it("scheduleReminder uses 'month' for monthly treatment", async () => {
    const monthly: Treatment = { ...treatment, frequency: "monthly" };
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.scheduleReminder(monthly);
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({ schedule: expect.objectContaining({ every: "month" }) }),
        ]),
      }),
    );
  });

  it("cancelReminder calls cancel with numeric id", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.cancelReminder("3");
    });
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 3 }] });
  });

  it("rescheduleAll cancels pending then reschedules all", async () => {
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: 1 }, { id: 2 }],
    } as PendingResult);
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
    expect(LocalNotifications.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ notifications: [{ id: 1 }, { id: 2 }] }),
    );
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAll skips bulk-cancel when no pending notifications but still pre-cancels per treatment", async () => {
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({ notifications: [] });
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.rescheduleAll([treatment]);
    });
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
});
