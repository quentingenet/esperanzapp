import { useCallback } from "react";
import { getAllHabits, createHabit as dbCreateHabit, deleteHabit as dbDeleteHabit } from "@/db";
import { useHabitsStore } from "@/store/habitsStore";
import { diffInDays, todayLocalDate } from "@/utils";
import type { Habit } from "@/types";

export function useHabits() {
  const { habits, loading, error, setHabits, addHabit: storeAdd, removeHabit } = useHabitsStore();

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
      const created = await dbCreateHabit(data);
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

  const getDayCount = useCallback(
    (habitId: string): number => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return 0;
      return diffInDays(habit.startDate, todayLocalDate());
    },
    [habits],
  );

  return { habits, loading, error, loadHabits, addHabit, deleteHabit, getDayCount };
}
