import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHabitLogs } from "./useHabitLogs";
import { createHabitLog, getHabitLogsByHabitId, recordHabitRelapse } from "@/db";
import type { HabitLog } from "@/types";

vi.mock("@/db", () => ({
  createHabitLog: vi.fn(),
  getHabitLogsByHabitId: vi.fn(),
  getAllHabitLogs: vi.fn().mockResolvedValue([]),
  recordHabitRelapse: vi.fn(),
}));

const startLog = (date: string): HabitLog => ({
  id: date,
  habitId: "1",
  eventType: "start",
  eventDate: date,
});

const relapseLog = (date: string): HabitLog => ({
  id: date + "-r",
  habitId: "1",
  eventType: "relapse",
  eventDate: date,
});

describe("useHabitLogs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
    vi.mocked(createHabitLog).mockResolvedValue(startLog("2024-01-01"));
    vi.mocked(getHabitLogsByHabitId).mockResolvedValue([]);
    vi.mocked(recordHabitRelapse).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("addLog calls createHabitLog and returns the log", async () => {
    const data: Omit<HabitLog, "id"> = { habitId: "1", eventType: "start", eventDate: "2024-01-01" };
    const { result } = renderHook(() => useHabitLogs());
    let log: HabitLog | undefined;
    await act(async () => {
      log = await result.current.addLog(data);
    });
    expect(createHabitLog).toHaveBeenCalledWith(data);
    expect(log?.eventType).toBe("start");
  });

  it("getLogsByHabit returns DB results", async () => {
    vi.mocked(getHabitLogsByHabitId).mockResolvedValueOnce([startLog("2024-01-01")]);
    const { result } = renderHook(() => useHabitLogs());
    let logs: HabitLog[] | undefined;
    await act(async () => {
      logs = await result.current.getLogsByHabit("1");
    });
    expect(logs).toHaveLength(1);
  });

  it("recordRelapse delegates the atomic relapse operation", async () => {
    const { result } = renderHook(() => useHabitLogs());
    await act(async () => {
      await result.current.recordRelapse("1", "2024-01-15");
    });
    expect(recordHabitRelapse).toHaveBeenCalledWith("1", "2024-01-15");
  });

  describe("getStats", () => {
    it("returns zeros for no logs", async () => {
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toEqual({ currentStreak: 0, longestStreak: 0, totalRelapses: 0, averageStreak: 0, startDate: "", lastRelapseDate: null, currentStreakStart: null });
    });

    it("single start: currentStreak = days since start", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([startLog("2024-01-01")]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 14, longestStreak: 14, totalRelapses: 0, startDate: "2024-01-01" });
    });

    it("start + relapse: totalRelapses=1, currentStreak=0", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        relapseLog("2024-01-05"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 0, longestStreak: 4, totalRelapses: 1, averageStreak: 4 });
    });

    it("multiple cycles: correct currentStreak and averageStreak", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        relapseLog("2024-01-05"),
        startLog("2024-01-06"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({
        currentStreak: 9,
        longestStreak: 9,
        totalRelapses: 1,
        averageStreak: 7,
        startDate: "2024-01-01",
      });
    });

    it("ignores relapse with no prior start", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([relapseLog("2024-01-05")]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 0, totalRelapses: 0, startDate: "" });
    });

    it("ignores multiple relapses before any start", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        relapseLog("2024-01-03"),
        relapseLog("2024-01-05"),
        startLog("2024-01-10"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 5, totalRelapses: 0, startDate: "2024-01-10" });
    });

    it("consecutive starts without relapse keep the first start date for the streak", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        startLog("2024-01-05"),
        relapseLog("2024-01-10"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      // streak from Jan 1 to Jan 10 = 9 days, not 5 (from Jan 5)
      expect(stats).toMatchObject({ currentStreak: 0, longestStreak: 9, totalRelapses: 1 });
    });

    it("consecutive starts after restart keep the post-relapse start", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        relapseLog("2024-01-05"),
        startLog("2024-01-06"),
        startLog("2024-01-08"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      // active streak from Jan 6 (not Jan 8), today=Jan 15 → 9 days
      expect(stats).toMatchObject({ currentStreak: 9, longestStreak: 9, totalRelapses: 1 });
    });

    it("relapse same day as start: currentStreak = 0", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        relapseLog("2024-01-15"),
        startLog("2024-01-15"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 0, totalRelapses: 1 });
    });

    it("relapse same day as new start: streak = 1 the next day", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-16T12:00:00.000Z"));
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        relapseLog("2024-01-15"),
        startLog("2024-01-15"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 1, totalRelapses: 1 });
      vi.useRealTimers();
    });

    it("currentStreak is never negative", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([startLog("2024-01-01")]);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-12-01T12:00:00.000Z"));
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect((stats as unknown as { currentStreak: number }).currentStreak).toBeGreaterThanOrEqual(0);
      vi.useRealTimers();
    });

    it("multiple relapses: correct streak after last one", async () => {
      vi.mocked(getHabitLogsByHabitId).mockResolvedValue([
        startLog("2024-01-01"),
        relapseLog("2024-01-05"),
        startLog("2024-01-06"),
        relapseLog("2024-01-10"),
        startLog("2024-01-10"),
      ]);
      const { result } = renderHook(() => useHabitLogs());
      let stats;
      await act(async () => {
        stats = await result.current.getStats("1");
      });
      expect(stats).toMatchObject({ currentStreak: 5, totalRelapses: 2 });
    });
  });
});
