import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreatments } from "./useTreatments";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import {
  getAllTreatments,
  createTreatment,
  deleteTreatment,
  updateTreatment,
  updateTreatmentsSortOrder,
} from "@/db";
import type { Treatment } from "@/types";

vi.mock("@/db", () => ({
  getAllTreatments: vi.fn(),
  createTreatment: vi.fn(),
  deleteTreatment: vi.fn(),
  updateTreatment: vi.fn(),
  updateTreatmentsSortOrder: vi.fn(),
}));

const treatment: Treatment = {
  id: "1",
  label: "Sertraline",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T10:00:00.000Z",
};

const treatmentB: Treatment = { ...treatment, id: "2", label: "Metformin" };
const treatmentC: Treatment = { ...treatment, id: "3", label: "Lisinopril" };

const treatmentData: Omit<Treatment, "id"> = {
  label: "Sertraline",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T10:00:00.000Z",
};

describe("useTreatments", () => {
  beforeEach(() => {
    useTreatmentsStore.setState({ treatments: [], loading: false });
    vi.mocked(getAllTreatments).mockResolvedValue([]);
    vi.mocked(createTreatment).mockResolvedValue(treatment);
    vi.mocked(deleteTreatment).mockResolvedValue(undefined);
    vi.mocked(updateTreatment).mockResolvedValue(undefined);
    vi.mocked(updateTreatmentsSortOrder).mockResolvedValue(undefined);
  });

  it("loadTreatments sets treatments from DB", async () => {
    vi.mocked(getAllTreatments).mockResolvedValueOnce([treatment]);
    const { result } = renderHook(() => useTreatments());
    await act(async () => {
      await result.current.loadTreatments();
    });
    expect(result.current.treatments).toHaveLength(1);
    expect(result.current.treatments[0]!.label).toBe("Sertraline");
  });

  it("loadTreatments resets loading to false", async () => {
    const { result } = renderHook(() => useTreatments());
    await act(async () => {
      await result.current.loadTreatments();
    });
    expect(result.current.loading).toBe(false);
  });

  it("addTreatment creates and stores", async () => {
    const { result } = renderHook(() => useTreatments());
    let created: Treatment | undefined;
    await act(async () => {
      created = await result.current.addTreatment(treatmentData);
    });
    expect(createTreatment).toHaveBeenCalledWith(treatmentData);
    expect(created).toEqual(treatment);
    expect(result.current.treatments).toHaveLength(1);
  });

  it("deleteTreatment removes from DB and store", async () => {
    useTreatmentsStore.setState({ treatments: [treatment] });
    const { result } = renderHook(() => useTreatments());
    await act(async () => {
      await result.current.deleteTreatment("1");
    });
    expect(deleteTreatment).toHaveBeenCalledWith("1");
    expect(result.current.treatments).toHaveLength(0);
  });

  it("editTreatment updates DB and store", async () => {
    useTreatmentsStore.setState({ treatments: [treatment] });
    const { result } = renderHook(() => useTreatments());
    await act(async () => {
      await result.current.editTreatment("1", {
        label: "Sertraline 50mg",
        reminderTime: "09:00",
        reminderEnabled: true,
        reminderDay: null,
      });
    });
    expect(updateTreatment).toHaveBeenCalledWith("1", {
      label: "Sertraline 50mg",
      reminderTime: "09:00",
      reminderEnabled: true,
      reminderDay: null,
    });
    expect(result.current.treatments[0]!.label).toBe("Sertraline 50mg");
    expect(result.current.treatments[0]!.reminderTime).toBe("09:00");
  });

  it("reorderTreatments reorders treatments in the store according to the given id list", () => {
    useTreatmentsStore.setState({ treatments: [treatment, treatmentB, treatmentC] });
    const { result } = renderHook(() => useTreatments());
    act(() => {
      result.current.reorderTreatments(["2", "3", "1"]);
    });
    expect(result.current.treatments.map((t) => t.id)).toEqual(["2", "3", "1"]);
  });

  it("reorderTreatments preserves treatments absent from orderedIds at the end of the list", () => {
    useTreatmentsStore.setState({ treatments: [treatment, treatmentB, treatmentC] });
    const { result } = renderHook(() => useTreatments());
    act(() => {
      result.current.reorderTreatments(["3", "1"]); // treatmentB (id=2) absent
    });
    expect(result.current.treatments.map((t) => t.id)).toEqual(["3", "1", "2"]);
  });

  it("saveTreatmentsOrder calls updateTreatmentsSortOrder with current treatments id order", async () => {
    useTreatmentsStore.setState({ treatments: [treatmentB, treatment, treatmentC] });
    const { result } = renderHook(() => useTreatments());
    await act(async () => {
      await result.current.saveTreatmentsOrder();
    });
    expect(updateTreatmentsSortOrder).toHaveBeenCalledWith(["2", "1", "3"]);
  });
});
