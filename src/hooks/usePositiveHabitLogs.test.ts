import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePositiveHabitLogs } from "./usePositiveHabitLogs";
import {
  upsertPositiveHabitLogForDate,
  getPositiveHabitLogsByDate,
  getPositiveHabitTakenCount,
} from "@/db";
import type { PositiveHabitLog } from "@/types";

vi.mock("@/db", () => ({
  upsertPositiveHabitLogForDate: vi.fn(),
  getPositiveHabitLogsByDate: vi.fn(),
  getPositiveHabitTakenCount: vi.fn(),
}));

const log: PositiveHabitLog = {
  id: "1",
  positiveHabitId: "1",
  scheduledAt: "2024-01-15",
  status: "taken",
};

describe("usePositiveHabitLogs", () => {
  beforeEach(() => {
    vi.mocked(upsertPositiveHabitLogForDate).mockResolvedValue(log);
  });

  it("logStatusForDate upserts to DB and returns the created log", async () => {
    const { result } = renderHook(() => usePositiveHabitLogs());
    let created: PositiveHabitLog | undefined;
    await act(async () => {
      created = await result.current.logStatusForDate("1", "2024-01-15", "taken");
    });
    expect(upsertPositiveHabitLogForDate).toHaveBeenCalledWith("1", "2024-01-15", "taken");
    expect(created).toEqual(log);
  });

  it("logStatusForDate status 'missed' is stored correctly", async () => {
    const missedLog: PositiveHabitLog = { ...log, id: "2", status: "missed" };
    vi.mocked(upsertPositiveHabitLogForDate).mockResolvedValueOnce(missedLog);
    const { result } = renderHook(() => usePositiveHabitLogs());
    let created: PositiveHabitLog | undefined;
    await act(async () => {
      created = await result.current.logStatusForDate("1", "2024-01-15", "missed");
    });
    expect(created?.status).toBe("missed");
  });

  it("getLogsByDate fetches logs for the given date", async () => {
    vi.mocked(getPositiveHabitLogsByDate).mockResolvedValueOnce([log]);
    const { result } = renderHook(() => usePositiveHabitLogs());
    let logs: PositiveHabitLog[] | undefined;
    await act(async () => {
      logs = await result.current.getLogsByDate("2024-01-15");
    });
    expect(getPositiveHabitLogsByDate).toHaveBeenCalledWith("2024-01-15");
    expect(logs).toEqual([log]);
  });

  it("getLogsByDate returns empty array when no logs for date", async () => {
    vi.mocked(getPositiveHabitLogsByDate).mockResolvedValueOnce([]);
    const { result } = renderHook(() => usePositiveHabitLogs());
    let logs: PositiveHabitLog[] | undefined;
    await act(async () => {
      logs = await result.current.getLogsByDate("2024-01-15");
    });
    expect(logs).toEqual([]);
  });

  it("getTakenCount fetches the cumulative taken count", async () => {
    vi.mocked(getPositiveHabitTakenCount).mockResolvedValueOnce(5);
    const { result } = renderHook(() => usePositiveHabitLogs());
    let count: number | undefined;
    await act(async () => {
      count = await result.current.getTakenCount("1");
    });
    expect(getPositiveHabitTakenCount).toHaveBeenCalledWith("1");
    expect(count).toBe(5);
  });
});
