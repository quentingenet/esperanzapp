import { create } from "zustand";
import type { Treatment } from "@/types";

type TreatmentsState = {
  treatments: Treatment[];
  loading: boolean;
  error: string | null;
};

type TreatmentsActions = {
  setTreatments: (treatments: Treatment[]) => void;
  addTreatment: (treatment: Treatment) => void;
  updateTreatment: (id: string, patch: Partial<Treatment>) => void;
  removeTreatment: (id: string) => void;
};

export const useTreatmentsStore = create<TreatmentsState & TreatmentsActions>((set) => ({
  treatments: [],
  loading: false,
  error: null,
  setTreatments: (treatments) => set({ treatments }),
  addTreatment: (t) => set((s) => ({ treatments: [...s.treatments, t] })),
  updateTreatment: (id, patch) =>
    set((s) => ({ treatments: s.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeTreatment: (id) => set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) })),
}));
