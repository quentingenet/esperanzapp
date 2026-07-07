import { useCallback, useRef } from "react";
import { useShallow } from "zustand/shallow";
import {
  createHabitWithInitialLog as dbCreateHabitWithInitialLog,
  deleteHabit as dbDeleteHabit,
  getAllHabits,
  updateHabitsSortOrder,
} from "@/db";
import { useHabitsStore } from "@/store/habitsStore";
import { todayLocalDate } from "@/utils";
import { logError } from "@/utils/logger";
import type { Habit } from "@/types";

export function useHabits() {
  const { habits, loading, error, setHabits, addHabit: storeAdd, removeHabit } = useHabitsStore(
    useShallow((s) => ({
      habits: s.habits,
      loading: s.loading,
      error: s.error,
      setHabits: s.setHabits,
      addHabit: s.addHabit,
      removeHabit: s.removeHabit,
    })),
  );

  const loadId = useRef(0);

  const loadHabits = useCallback(async () => {
    const id = ++loadId.current;
    useHabitsStore.setState({ loading: true, error: null });
    try {
      const data = await getAllHabits();
      if (id !== loadId.current) return;
      setHabits(data);
    } catch (e) {
      if (id !== loadId.current) return;
      logError("useHabits.loadHabits", e);
      useHabitsStore.setState({ error: e instanceof Error ? e.message : "error" });
    } finally {
      if (id === loadId.current) useHabitsStore.setState({ loading: false });
    }
  }, [setHabits]);

  const addHabitWithInitialLog = useCallback(
    async (data: Omit<Habit, "id">): Promise<Habit> => {
      if (data.startDate > todayLocalDate()) {
        throw new Error("startDate cannot be in the future");
      }
      const created = await dbCreateHabitWithInitialLog(data, data.startDate);
      storeAdd(created);
      return created;
    },
    [storeAdd],
  );

  const deleteHabit = useCallback(
    async (id: string): Promise<void> => {
      await dbDeleteHabit(id);
      removeHabit(id);
    },
    [removeHabit],
  );

  const reorderHabits = useCallback(
    (orderedIds: string[]): void => {
      const byId = new Map(habits.map((h) => [h.id, h]));
      const sorted = orderedIds.map((id) => byId.get(id)).filter((h): h is Habit => h !== undefined);
      const orderedSet = new Set(orderedIds);
      const remaining = habits.filter((h) => !orderedSet.has(h.id));
      setHabits([...sorted, ...remaining]);
    },
    [habits, setHabits],
  );

  const saveHabitsOrder = useCallback(
    async (): Promise<void> => {
      await updateHabitsSortOrder(habits.map((h) => h.id));
    },
    [habits],
  );

  return { habits, loading, error, loadHabits, addHabitWithInitialLog, deleteHabit, reorderHabits, saveHabitsOrder };
}
