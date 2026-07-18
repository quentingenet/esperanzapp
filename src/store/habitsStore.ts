import { create } from "zustand";
import type { Habit } from "@/types";

type HabitsState = {
  habits: Habit[];
  loading: boolean;
  error: string | null;
};

type HabitsActions = {
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
};

export const useHabitsStore = create<HabitsState & HabitsActions>((set) => ({
  habits: [],
  loading: true,
  error: null,
  setHabits: (habits) => set({ habits }),
  addHabit: (habit) => set((s) => ({ habits: [...s.habits, habit] })),
  updateHabit: (id, patch) =>
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
  removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
}));
