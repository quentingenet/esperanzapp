import { create } from "zustand";

type Severity = "success" | "error" | "warning" | "info";

interface ToastStore {
  open: boolean;
  message: string;
  severity: Severity;
  show: (message: string, severity?: Severity) => void;
  hide: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  open: false,
  message: "",
  severity: "success",
  show: (message, severity = "success") => set({ open: true, message, severity }),
  hide: () => set({ open: false }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, "success"),
  error:   (message: string) => useToastStore.getState().show(message, "error"),
  warning: (message: string) => useToastStore.getState().show(message, "warning"),
  info:    (message: string) => useToastStore.getState().show(message, "info"),
};
