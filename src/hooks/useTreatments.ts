import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import {
  getAllTreatments,
  createTreatment as dbCreateTreatment,
  deleteTreatment as dbDeleteTreatment,
  updateTreatment as dbUpdateTreatment,
  updateTreatmentsSortOrder,
} from "@/db";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import type { Treatment } from "@/types";

export function useTreatments() {
  const { treatments, loading, setTreatments, addTreatment: storeAdd, removeTreatment } =
    useTreatmentsStore(
      useShallow((s) => ({
        treatments: s.treatments,
        loading: s.loading,
        setTreatments: s.setTreatments,
        addTreatment: s.addTreatment,
        removeTreatment: s.removeTreatment,
      })),
    );

  const loadTreatments = useCallback(async () => {
    useTreatmentsStore.setState({ loading: true });
    try {
      const data = await getAllTreatments();
      setTreatments(data);
    } catch {
      // Keep the current store when a refresh fails.
    } finally {
      useTreatmentsStore.setState({ loading: false });
    }
  }, [setTreatments]);

  const addTreatment = useCallback(
    async (data: Omit<Treatment, "id">): Promise<Treatment> => {
      const created = await dbCreateTreatment(data);
      storeAdd(created);
      return created;
    },
    [storeAdd],
  );

  const editTreatment = useCallback(
    async (id: string, data: Pick<Treatment, "label" | "reminderTime" | "reminderEnabled" | "reminderDay">): Promise<void> => {
      await dbUpdateTreatment(id, data);
      useTreatmentsStore.getState().updateTreatment(id, data);
    },
    [],
  );

  const deleteTreatment = useCallback(
    async (id: string): Promise<void> => {
      await dbDeleteTreatment(id);
      removeTreatment(id);
    },
    [removeTreatment],
  );

  const reorderTreatments = useCallback(
    (orderedIds: string[]): void => {
      const byId = new Map(treatments.map((t) => [t.id, t]));
      const sorted = orderedIds.map((id) => byId.get(id)).filter((t): t is Treatment => t !== undefined);
      setTreatments(sorted);
    },
    [treatments, setTreatments],
  );

  const saveTreatmentsOrder = useCallback(
    async (): Promise<void> => {
      await updateTreatmentsSortOrder(treatments.map((t) => t.id));
    },
    [treatments],
  );

  return { treatments, loading, loadTreatments, addTreatment, editTreatment, deleteTreatment, reorderTreatments, saveTreatmentsOrder };
}
