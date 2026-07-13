import { useCallback, useRef } from "react";
import { logError } from "@/utils/logger";
import { useShallow } from "zustand/shallow";
import {
  getAllPositiveHabits,
  createPositiveHabit as dbCreatePositiveHabit,
  deletePositiveHabit as dbDeletePositiveHabit,
  updatePositiveHabit as dbUpdatePositiveHabit,
  updatePositiveHabitsSortOrder,
} from "@/db";
import { usePositiveHabitsStore } from "@/store/positiveHabitsStore";
import type { PositiveHabit } from "@/types";

export function usePositiveHabits() {
  const {
    positiveHabits,
    loading,
    error,
    setPositiveHabits,
    addPositiveHabit: storeAdd,
    removePositiveHabit,
  } = usePositiveHabitsStore(
    useShallow((s) => ({
      positiveHabits: s.positiveHabits,
      loading: s.loading,
      error: s.error,
      setPositiveHabits: s.setPositiveHabits,
      addPositiveHabit: s.addPositiveHabit,
      removePositiveHabit: s.removePositiveHabit,
    })),
  );

  const loadId = useRef(0);

  const loadPositiveHabits = useCallback(async () => {
    const id = ++loadId.current;
    usePositiveHabitsStore.setState({ loading: true, error: null });
    try {
      const data = await getAllPositiveHabits();
      if (id !== loadId.current) return;
      setPositiveHabits(data);
    } catch (e: unknown) {
      if (id !== loadId.current) return;
      logError("usePositiveHabits.loadPositiveHabits", e);
      usePositiveHabitsStore.setState({ error: e instanceof Error ? e.message : "error" });
    } finally {
      if (id === loadId.current) usePositiveHabitsStore.setState({ loading: false });
    }
  }, [setPositiveHabits]);

  const addPositiveHabit = useCallback(
    async (data: Omit<PositiveHabit, "id">): Promise<PositiveHabit> => {
      const created = await dbCreatePositiveHabit(data);
      storeAdd(created);
      return created;
    },
    [storeAdd],
  );

  const editPositiveHabit = useCallback(
    async (
      id: string,
      data: Pick<
        PositiveHabit,
        "label" | "icon" | "color" | "bgColor" | "reminderTime" | "reminderEnabled" | "reminderDay"
      >,
    ): Promise<void> => {
      await dbUpdatePositiveHabit(id, data);
      usePositiveHabitsStore.getState().updatePositiveHabit(id, data);
    },
    [],
  );

  const deletePositiveHabit = useCallback(
    async (id: string): Promise<void> => {
      await dbDeletePositiveHabit(id);
      removePositiveHabit(id);
    },
    [removePositiveHabit],
  );

  const reorderPositiveHabits = useCallback(
    (orderedIds: string[]): void => {
      const byId = new Map(positiveHabits.map((h) => [h.id, h]));
      const sorted = orderedIds
        .map((id) => byId.get(id))
        .filter((h): h is PositiveHabit => h !== undefined);
      const orderedSet = new Set(orderedIds);
      const remaining = positiveHabits.filter((h) => !orderedSet.has(h.id));
      setPositiveHabits([...sorted, ...remaining]);
    },
    [positiveHabits, setPositiveHabits],
  );

  const savePositiveHabitsOrder = useCallback(async (): Promise<void> => {
    await updatePositiveHabitsSortOrder(positiveHabits.map((h) => h.id));
  }, [positiveHabits]);

  return {
    positiveHabits,
    loading,
    error,
    loadPositiveHabits,
    addPositiveHabit,
    editPositiveHabit,
    deletePositiveHabit,
    reorderPositiveHabits,
    savePositiveHabitsOrder,
  };
}
