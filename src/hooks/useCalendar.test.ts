import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalendar } from "./useCalendar";
import { getHabitLogsByHabitId, getTreatmentLogsByTreatmentId } from "@/db";
import type { HabitLog, TreatmentLog, DayStatus, TreatmentStatus } from "@/types";

vi.mock("@/db", () => ({
  getHabitLogsByHabitId: vi.fn(),
  getTreatmentLogsByTreatmentId: vi.fn(),
}));

describe("useCalendar", () => {
  beforeEach(() => {
    vi.mocked(getHabitLogsByHabitId).mockResolvedValue([]);
    vi.mocked(getTreatmentLogsByTreatmentId).mockResolvedValue([]);
  });

  it("getHabitDayStatusMap returns empty map for no logs", async () => {
    const { result } = renderHook(() => useCalendar());
    let map: Record<string, DayStatus> | undefined;
    await act(async () => {
      map = await result.current.getHabitDayStatusMap("1");
    });
    expect(getHabitLogsByHabitId).toHaveBeenCalledWith("1");
    expect(map).toEqual({});
  });

  it("getHabitDayStatusMap marks start date", async () => {
    const startLog: HabitLog = { id: "1", habitId: "1", eventType: "start", eventDate: "2024-01-01" };
    vi.mocked(getHabitLogsByHabitId).mockResolvedValueOnce([startLog]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
    const { result } = renderHook(() => useCalendar());
    let map: Record<string, DayStatus> | undefined;
    await act(async () => {
      map = await result.current.getHabitDayStatusMap("1");
    });
    expect(map?.["2024-01-01"]).toBe("start");
    vi.useRealTimers();
  });

  it("getTreatmentStatusMap returns empty map for no logs", async () => {
    const { result } = renderHook(() => useCalendar());
    let map: Record<string, TreatmentStatus> | undefined;
    await act(async () => {
      map = await result.current.getTreatmentStatusMap("1");
    });
    expect(getTreatmentLogsByTreatmentId).toHaveBeenCalledWith("1");
    expect(map).toEqual({});
  });

  it("getTreatmentStatusMap maps taken status by date", async () => {
    const log: TreatmentLog = {
      id: "1",
      treatmentId: "1",
      scheduledAt: "2024-01-15T08:00:00.000Z",
      status: "taken",
    };
    vi.mocked(getTreatmentLogsByTreatmentId).mockResolvedValueOnce([log]);
    const { result } = renderHook(() => useCalendar());
    let map: Record<string, TreatmentStatus> | undefined;
    await act(async () => {
      map = await result.current.getTreatmentStatusMap("1");
    });
    expect(map?.["2024-01-15T08:00:00.000Z"]).toBe("taken");
  });
});
