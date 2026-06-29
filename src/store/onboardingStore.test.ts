import { describe, it, expect, beforeEach } from "vitest";
import { useOnboardingStore } from "./onboardingStore";

describe("onboardingStore", () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      privacyAccepted: false,
      tutorialCompleted: false,
      userName: "",
    });
  });

  it("initial state", () => {
    const s = useOnboardingStore.getState();
    expect(s.privacyAccepted).toBe(false);
    expect(s.tutorialCompleted).toBe(false);
    expect(s.userName).toBe("");
  });

  it("setPrivacyAccepted", () => {
    useOnboardingStore.getState().setPrivacyAccepted(true);
    expect(useOnboardingStore.getState().privacyAccepted).toBe(true);
  });

  it("setTutorialCompleted", () => {
    useOnboardingStore.getState().setTutorialCompleted(true);
    expect(useOnboardingStore.getState().tutorialCompleted).toBe(true);
  });

  it("setUserName", () => {
    useOnboardingStore.getState().setUserName("Alice");
    expect(useOnboardingStore.getState().userName).toBe("Alice");
  });

  it("setUserName with empty string", () => {
    useOnboardingStore.getState().setUserName("");
    expect(useOnboardingStore.getState().userName).toBe("");
  });
});
