import { create } from "zustand";
import type { Treatment, TreatmentLog } from "@/types";

type TreatmentsState = {
  treatments: Treatment[];
  logs: TreatmentLog[];
  loading: boolean;
};

type TreatmentsActions = {
  setTreatments: (treatments: Treatment[]) => void;
  addTreatment: (treatment: Treatment) => void;
  removeTreatment: (id: string) => void;
  setLogs: (logs: TreatmentLog[]) => void;
  addLog: (log: TreatmentLog) => void;
};

export const useTreatmentsStore = create<TreatmentsState & TreatmentsActions>((set) => ({
  treatments: [],
  logs: [],
  loading: false,
  setTreatments: (treatments) => set({ treatments }),
  addTreatment: (t) => set((s) => ({ treatments: [...s.treatments, t] })),
  removeTreatment: (id) => set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) })),
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((s) => ({ logs: [...s.logs, log] })),
}));
