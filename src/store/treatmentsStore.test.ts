import { describe, it, expect, beforeEach } from "vitest";
import { useTreatmentsStore } from "./treatmentsStore";
import type { Treatment } from "@/types";

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

describe("treatmentsStore", () => {
  beforeEach(() => {
    useTreatmentsStore.setState({ treatments: [], loading: false });
  });

  it("initial state", () => {
    const s = useTreatmentsStore.getState();
    expect(s.treatments).toEqual([]);
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
    expect(useTreatmentsStore.getState().treatments[0]!.id).toBe("2");
  });

  it("updateTreatment updates matching treatment in place", () => {
    useTreatmentsStore.getState().setTreatments([t1, t2]);
    useTreatmentsStore.getState().updateTreatment("1", { label: "Updated" });
    const { treatments } = useTreatmentsStore.getState();
    expect(treatments[0]?.label).toBe("Updated");
    expect(treatments[1]?.label).toBe("Metformin");
  });

  it("updateTreatment is a no-op for unknown id", () => {
    useTreatmentsStore.getState().setTreatments([t1]);
    useTreatmentsStore.getState().updateTreatment("999", { label: "Ghost" });
    expect(useTreatmentsStore.getState().treatments[0]?.label).toBe("Sertraline");
  });
});
