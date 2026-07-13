import { create } from "zustand";
import type { PositiveHabit } from "@/types";

type PositiveHabitsState = {
  positiveHabits: PositiveHabit[];
  loading: boolean;
  error: string | null;
};

type PositiveHabitsActions = {
  setPositiveHabits: (positiveHabits: PositiveHabit[]) => void;
  addPositiveHabit: (positiveHabit: PositiveHabit) => void;
  updatePositiveHabit: (id: string, patch: Partial<PositiveHabit>) => void;
  removePositiveHabit: (id: string) => void;
};

export const usePositiveHabitsStore = create<PositiveHabitsState & PositiveHabitsActions>(
  (set) => ({
    positiveHabits: [],
    loading: true,
    error: null,
    setPositiveHabits: (positiveHabits) => set({ positiveHabits }),
    addPositiveHabit: (h) => set((s) => ({ positiveHabits: [...s.positiveHabits, h] })),
    updatePositiveHabit: (id, patch) =>
      set((s) => ({
        positiveHabits: s.positiveHabits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),
    removePositiveHabit: (id) =>
      set((s) => ({ positiveHabits: s.positiveHabits.filter((h) => h.id !== id) })),
  }),
);
