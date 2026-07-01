import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import {
  getAllTreatments,
  createTreatment as dbCreateTreatment,
  deleteTreatment as dbDeleteTreatment,
  updateTreatment as dbUpdateTreatment,
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

  return { treatments, loading, loadTreatments, addTreatment, editTreatment, deleteTreatment };
}
