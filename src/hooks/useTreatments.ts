import { useCallback, useRef } from "react";
import { logError } from "@/utils/logger";
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
  const {
    treatments,
    loading,
    error,
    setTreatments,
    addTreatment: storeAdd,
    removeTreatment,
  } = useTreatmentsStore(
    useShallow((s) => ({
      treatments: s.treatments,
      loading: s.loading,
      error: s.error,
      setTreatments: s.setTreatments,
      addTreatment: s.addTreatment,
      removeTreatment: s.removeTreatment,
    })),
  );

  const loadId = useRef(0);

  const loadTreatments = useCallback(async () => {
    const id = ++loadId.current;
    useTreatmentsStore.setState({ loading: true, error: null });
    try {
      const data = await getAllTreatments();
      if (id !== loadId.current) return;
      setTreatments(data);
    } catch (e: unknown) {
      if (id !== loadId.current) return;
      logError("useTreatments.loadTreatments", e);
      useTreatmentsStore.setState({ error: e instanceof Error ? e.message : "error" });
    } finally {
      if (id === loadId.current) useTreatmentsStore.setState({ loading: false });
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
    async (
      id: string,
      data: Pick<Treatment, "label" | "reminderTime" | "reminderEnabled" | "reminderDay">,
    ): Promise<void> => {
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
      const sorted = orderedIds
        .map((id) => byId.get(id))
        .filter((t): t is Treatment => t !== undefined);
      const orderedSet = new Set(orderedIds);
      const remaining = treatments.filter((t) => !orderedSet.has(t.id));
      setTreatments([...sorted, ...remaining]);
    },
    [treatments, setTreatments],
  );

  const saveTreatmentsOrder = useCallback(async (): Promise<void> => {
    await updateTreatmentsSortOrder(treatments.map((t) => t.id));
  }, [treatments]);

  return {
    treatments,
    loading,
    error,
    loadTreatments,
    addTreatment,
    editTreatment,
    deleteTreatment,
    reorderTreatments,
    saveTreatmentsOrder,
  };
}
