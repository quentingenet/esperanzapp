import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreatments } from "./useTreatments";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import { getAllTreatments, createTreatment, deleteTreatment } from "@/db";
import type { Treatment } from "@/types";

vi.mock("@/db", () => ({
  getAllTreatments: vi.fn(),
  createTreatment: vi.fn(),
  deleteTreatment: vi.fn(),
}));

const treatment: Treatment = {
  id: "1",
  label: "Sertraline",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  createdAt: "2024-01-01T10:00:00.000Z",
};

const treatmentData: Omit<Treatment, "id"> = {
  label: "Sertraline",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  createdAt: "2024-01-01T10:00:00.000Z",
};

describe("useTreatments", () => {
  beforeEach(() => {
    useTreatmentsStore.setState({ treatments: [], logs: [], loading: false });
    vi.mocked(getAllTreatments).mockResolvedValue([]);
    vi.mocked(createTreatment).mockResolvedValue(treatment);
    vi.mocked(deleteTreatment).mockResolvedValue(undefined);
  });

  it("loadTreatments sets treatments from DB", async () => {
    vi.mocked(getAllTreatments).mockResolvedValueOnce([treatment]);
    const { result } = renderHook(() => useTreatments());
    await act(async () => {
      await result.current.loadTreatments();
    });
    expect(result.current.treatments).toHaveLength(1);
    expect(result.current.treatments[0].label).toBe("Sertraline");
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
});
