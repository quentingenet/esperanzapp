import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreatmentLogs } from "./useTreatmentLogs";
import { upsertTreatmentLogForDate, getTreatmentLogsByDate } from "@/db";
import type { TreatmentLog } from "@/types";


vi.mock("@/db", () => ({
  upsertTreatmentLogForDate: vi.fn(),
  getTreatmentLogsByDate: vi.fn(),
}));

const log: TreatmentLog = {
  id: "1",
  treatmentId: "1",
  scheduledAt: "2024-01-15",
  status: "taken",
};

describe("useTreatmentLogs", () => {
  beforeEach(() => {
    vi.mocked(upsertTreatmentLogForDate).mockResolvedValue(log);
  });

  it("logStatus upserts to DB and returns the created log", async () => {
    const { result } = renderHook(() => useTreatmentLogs());
    let created: TreatmentLog | undefined;
    await act(async () => {
      created = await result.current.logStatus({ treatmentId: "1", scheduledAt: "2024-01-15", status: "taken" });
    });
    expect(upsertTreatmentLogForDate).toHaveBeenCalledWith("1", "2024-01-15", "taken");
    expect(created).toEqual(log);
  });

  it("logStatus status 'missed' is stored correctly", async () => {
    const missedLog: TreatmentLog = { ...log, id: "2", status: "missed" };
    vi.mocked(upsertTreatmentLogForDate).mockResolvedValueOnce(missedLog);
    const { result } = renderHook(() => useTreatmentLogs());
    let created: TreatmentLog | undefined;
    await act(async () => {
      created = await result.current.logStatus({ treatmentId: "1", scheduledAt: "2024-01-15", status: "missed" });
    });
    expect(upsertTreatmentLogForDate).toHaveBeenCalledWith("1", "2024-01-15", "missed");
    expect(created?.status).toBe("missed");
  });

  it("logStatusForDate upserts to DB and returns the log", async () => {
    const { result } = renderHook(() => useTreatmentLogs());
    let returned: TreatmentLog | undefined;
    await act(async () => {
      returned = await result.current.logStatusForDate("1", "2024-01-15", "taken");
    });
    expect(upsertTreatmentLogForDate).toHaveBeenCalledWith("1", "2024-01-15", "taken");
    expect(returned).toEqual(log);
  });

  it("getLogsByDate fetches logs for the given date", async () => {
    vi.mocked(getTreatmentLogsByDate).mockResolvedValueOnce([log]);
    const { result } = renderHook(() => useTreatmentLogs());
    let logs: TreatmentLog[] | undefined;
    await act(async () => {
      logs = await result.current.getLogsByDate("2024-01-15");
    });
    expect(getTreatmentLogsByDate).toHaveBeenCalledWith("2024-01-15");
    expect(logs).toEqual([log]);
  });

  it("getLogsByDate returns empty array when no logs for date", async () => {
    vi.mocked(getTreatmentLogsByDate).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useTreatmentLogs());
    let logs: TreatmentLog[] | undefined;
    await act(async () => {
      logs = await result.current.getLogsByDate("2024-01-15");
    });
    expect(logs).toEqual([]);
  });
});
