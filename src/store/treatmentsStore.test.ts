import { describe, it, expect, beforeEach } from "vitest";
import { useTreatmentsStore } from "./treatmentsStore";
import type { Treatment, TreatmentLog } from "@/types";

const t1: Treatment = {
  id: "1",
  label: "Sertraline",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T10:00:00.000Z",
};

const t2: Treatment = { ...t1, id: "2", label: "Metformin" };

const log1: TreatmentLog = {
  id: "1",
  treatmentId: "1",
  scheduledAt: "2024-01-15T08:00:00.000Z",
  status: "taken",
};

describe("treatmentsStore", () => {
  beforeEach(() => {
    useTreatmentsStore.setState({ treatments: [], logs: [], loading: false });
  });

  it("initial state", () => {
    const s = useTreatmentsStore.getState();
    expect(s.treatments).toEqual([]);
    expect(s.logs).toEqual([]);
    expect(s.loading).toBe(false);
  });

  it("setTreatments replaces array", () => {
    useTreatmentsStore.getState().setTreatments([t1, t2]);
    expect(useTreatmentsStore.getState().treatments).toEqual([t1, t2]);
  });

  it("addTreatment appends", () => {
    useTreatmentsStore.getState().addTreatment(t1);
    expect(useTreatmentsStore.getState().treatments).toHaveLength(1);
    expect(useTreatmentsStore.getState().treatments[0]).toEqual(t1);
  });

  it("removeTreatment filters by id", () => {
    useTreatmentsStore.getState().setTreatments([t1, t2]);
    useTreatmentsStore.getState().removeTreatment("1");
    expect(useTreatmentsStore.getState().treatments).toHaveLength(1);
    expect(useTreatmentsStore.getState().treatments[0].id).toBe("2");
  });

  it("setLogs replaces logs", () => {
    useTreatmentsStore.getState().setLogs([log1]);
    expect(useTreatmentsStore.getState().logs).toEqual([log1]);
  });

  it("addLog appends", () => {
    useTreatmentsStore.getState().addLog(log1);
    useTreatmentsStore.getState().addLog({ ...log1, id: "2" });
    expect(useTreatmentsStore.getState().logs).toHaveLength(2);
  });
});
