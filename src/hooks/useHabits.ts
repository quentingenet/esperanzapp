import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import {
  createHabit as dbCreateHabit,
  createHabitWithInitialLog as dbCreateHabitWithInitialLog,
  deleteHabit as dbDeleteHabit,
  getAllHabits,
  updateHabitsSortOrder,
} from "@/db";
import { useHabitsStore } from "@/store/habitsStore";
import { todayLocalDate } from "@/utils";
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

  const loadHabits = useCallback(async () => {
    useHabitsStore.setState({ loading: true, error: null });
    try {
      const data = await getAllHabits();
      setHabits(data);
    } catch (e) {
      useHabitsStore.setState({ error: e instanceof Error ? e.message : "error" });
    } finally {
      useHabitsStore.setState({ loading: false });
    }
  }, [setHabits]);

  const addHabit = useCallback(
    async (data: Omit<Habit, "id">): Promise<Habit> => {
      if (data.startDate > todayLocalDate()) {
        throw new Error("startDate cannot be in the future");
      }
      const created = await dbCreateHabit(data);
      storeAdd(created);
      return created;
    },
    [storeAdd],
  );

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
      setHabits(sorted);
    },
    [habits, setHabits],
  );

  const saveHabitsOrder = useCallback(
    async (): Promise<void> => {
      await updateHabitsSortOrder(habits.map((h) => h.id));
    },
    [habits],
  );

  return { habits, loading, error, loadHabits, addHabit, addHabitWithInitialLog, deleteHabit, reorderHabits, saveHabitsOrder };
}
