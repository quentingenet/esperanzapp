import { create } from "zustand";

export type HomeSubTab = "reduce" | "build";

interface HomeTabState {
  pendingTab: HomeSubTab | null;
  setPendingTab: (tab: HomeSubTab) => void;
  consumePendingTab: () => HomeSubTab | null;
}

// Set by App.tsx when a notification tap should open Home on a specific sub-tab
// (e.g. a positive-habit reminder should open "build", not the default "reduce").
// Home.tsx reads it once on mount and clears it so it doesn't stick across later visits.
export const useHomeTabStore = create<HomeTabState>((set, get) => ({
  pendingTab: null,
  setPendingTab: (tab) => {
    set({ pendingTab: tab });
  },
  consumePendingTab: () => {
    const tab = get().pendingTab;
    if (tab !== null) set({ pendingTab: null });
    return tab;
  },
}));
