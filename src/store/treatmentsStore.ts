import { create } from "zustand";
import type { Treatment, TreatmentLog } from "@/types";

type TreatmentsState = {
  treatments: Treatment[];
  logs: TreatmentLog[];
  loading: boolean;
  error: string | null;
};

type TreatmentsActions = {
  setTreatments: (treatments: Treatment[]) => void;
  addTreatment: (treatment: Treatment) => void;
  updateTreatment: (id: string, patch: Partial<Treatment>) => void;
  removeTreatment: (id: string) => void;
  setLogs: (logs: TreatmentLog[]) => void;
  addLog: (log: TreatmentLog) => void;
  upsertLog: (log: TreatmentLog) => void;
};

export const useTreatmentsStore = create<TreatmentsState & TreatmentsActions>((set) => ({
  treatments: [],
  logs: [],
  loading: false,
  error: null,
  setTreatments: (treatments) => set({ treatments }),
  addTreatment: (t) => set((s) => ({ treatments: [...s.treatments, t] })),
  updateTreatment: (id, patch) =>
    set((s) => ({ treatments: s.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeTreatment: (id) => set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) })),
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((s) => ({ logs: [...s.logs, log] })),
  upsertLog: (log) =>
    set((s) => {
      const idx = s.logs.findIndex(
        (l) => l.treatmentId === log.treatmentId && l.scheduledAt === log.scheduledAt,
      );
      if (idx === -1) return { logs: [...s.logs, log] };
      const next = [...s.logs];
      next[idx] = log;
      return { logs: next };
    }),
}));
