import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreatmentLogs } from "./useTreatmentLogs";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import { getTreatmentLogsByTreatmentId, upsertTreatmentLogForDate } from "@/db";
import type { TreatmentLog } from "@/types";

vi.mock("@/db", () => ({
  upsertTreatmentLogForDate: vi.fn(),
  getTreatmentLogsByTreatmentId: vi.fn(),
}));

const log: TreatmentLog = {
  id: "1",
  treatmentId: "1",
  scheduledAt: "2024-01-15",
  status: "taken",
};

describe("useTreatmentLogs", () => {
  beforeEach(() => {
    useTreatmentsStore.setState({ treatments: [], logs: [], loading: false });
    vi.mocked(upsertTreatmentLogForDate).mockResolvedValue(log);
    vi.mocked(getTreatmentLogsByTreatmentId).mockResolvedValue([]);
  });

  it("logStatus upserts log and adds to store", async () => {
    const { result } = renderHook(() => useTreatmentLogs());
    let created: TreatmentLog | undefined;
    await act(async () => {
      created = await result.current.logStatus({ treatmentId: "1", scheduledAt: "2024-01-15", status: "taken" });
    });
    expect(upsertTreatmentLogForDate).toHaveBeenCalledWith("1", "2024-01-15", "taken");
    expect(created).toEqual(log);
    expect(useTreatmentsStore.getState().logs).toHaveLength(1);
  });

  it("getLogsByTreatment returns DB results", async () => {
    vi.mocked(getTreatmentLogsByTreatmentId).mockResolvedValueOnce([log]);
    const { result } = renderHook(() => useTreatmentLogs());
    let logs: TreatmentLog[] | undefined;
    await act(async () => {
      logs = await result.current.getLogsByTreatment("1");
    });
    expect(getTreatmentLogsByTreatmentId).toHaveBeenCalledWith("1");
    expect(logs).toHaveLength(1);
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
});
