import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalendar } from "./useCalendar";
import { getTreatmentLogsByTreatmentId, getPositiveHabitLogsByPositiveHabitId } from "@/db";
import type { PositiveHabitLog, TreatmentLog, TreatmentStatus } from "@/types";

vi.mock("@/db", () => ({
  getTreatmentLogsByTreatmentId: vi.fn(),
  getPositiveHabitLogsByPositiveHabitId: vi.fn(),
}));

describe("useCalendar", () => {
  beforeEach(() => {
    vi.mocked(getTreatmentLogsByTreatmentId).mockResolvedValue([]);
    vi.mocked(getPositiveHabitLogsByPositiveHabitId).mockResolvedValue([]);
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
    expect(map?.["2024-01-15"]).toBe("taken");
  });

  it("getPositiveHabitStatusMap returns empty map for no logs", async () => {
    const { result } = renderHook(() => useCalendar());
    let map: Record<string, TreatmentStatus> | undefined;
    await act(async () => {
      map = await result.current.getPositiveHabitStatusMap("1");
    });
    expect(getPositiveHabitLogsByPositiveHabitId).toHaveBeenCalledWith("1");
    expect(map).toEqual({});
  });

  it("getPositiveHabitStatusMap maps taken status by date", async () => {
    const log: PositiveHabitLog = {
      id: "1",
      positiveHabitId: "1",
      scheduledAt: "2024-01-15T08:00:00.000Z",
      status: "taken",
    };
    vi.mocked(getPositiveHabitLogsByPositiveHabitId).mockResolvedValueOnce([log]);
    const { result } = renderHook(() => useCalendar());
    let map: Record<string, TreatmentStatus> | undefined;
    await act(async () => {
      map = await result.current.getPositiveHabitStatusMap("1");
    });
    expect(map?.["2024-01-15"]).toBe("taken");
  });
});
