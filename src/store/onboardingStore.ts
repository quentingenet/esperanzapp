import { create } from "zustand";

type OnboardingState = {
  privacyAccepted: boolean;
  tutorialCompleted: boolean;
  userName: string;
};

type OnboardingActions = {
  setPrivacyAccepted: (value: boolean) => void;
  setTutorialCompleted: (value: boolean) => void;
  setUserName: (name: string) => void;
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>((set) => ({
  privacyAccepted: false,
  tutorialCompleted: false,
  userName: "",
  setPrivacyAccepted: (value) => set({ privacyAccepted: value }),
  setTutorialCompleted: (value) => set({ tutorialCompleted: value }),
  setUserName: (name) => set({ userName: name }),
}));
