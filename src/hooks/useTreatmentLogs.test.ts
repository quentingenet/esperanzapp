import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreatmentLogs } from "./useTreatmentLogs";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import { createTreatmentLog, getTreatmentLogsByTreatmentId } from "@/db";
import type { TreatmentLog } from "@/types";

vi.mock("@/db", () => ({
  createTreatmentLog: vi.fn(),
  getTreatmentLogsByTreatmentId: vi.fn(),
}));

const log: TreatmentLog = {
  id: "1",
  treatmentId: "1",
  scheduledAt: "2024-01-15T08:00:00.000Z",
  status: "taken",
};

const logData: Omit<TreatmentLog, "id"> = {
  treatmentId: "1",
  scheduledAt: "2024-01-15T08:00:00.000Z",
  status: "taken",
};

describe("useTreatmentLogs", () => {
  beforeEach(() => {
    useTreatmentsStore.setState({ treatments: [], logs: [], loading: false });
    vi.mocked(createTreatmentLog).mockResolvedValue(log);
    vi.mocked(getTreatmentLogsByTreatmentId).mockResolvedValue([]);
  });

  it("logStatus creates log and adds to store", async () => {
    const { result } = renderHook(() => useTreatmentLogs());
    let created: TreatmentLog | undefined;
    await act(async () => {
      created = await result.current.logStatus(logData);
    });
    expect(createTreatmentLog).toHaveBeenCalledWith(logData);
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
    vi.mocked(createTreatmentLog).mockResolvedValueOnce(missedLog);
    const { result } = renderHook(() => useTreatmentLogs());
    let created: TreatmentLog | undefined;
    await act(async () => {
      created = await result.current.logStatus({ ...logData, status: "missed" });
    });
    expect(created?.status).toBe("missed");
  });
});
