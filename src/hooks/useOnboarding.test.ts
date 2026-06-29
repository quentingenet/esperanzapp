import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOnboarding } from "./useOnboarding";
import { useOnboardingStore } from "@/store/onboardingStore";
import { getOnboardingValue, setOnboardingValue } from "@/db";

vi.mock("@/db", () => ({
  getOnboardingValue: vi.fn(),
  setOnboardingValue: vi.fn(),
}));

describe("useOnboarding", () => {
  beforeEach(() => {
    useOnboardingStore.setState({ privacyAccepted: false, tutorialCompleted: false, userName: "" });
    vi.mocked(getOnboardingValue).mockResolvedValue(null);
    vi.mocked(setOnboardingValue).mockResolvedValue(undefined);
    // Simulate language already chosen so init() skips language step by default
    localStorage.setItem("i18n_lang", "fr");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("starts at language step when no language chosen", async () => {
    localStorage.removeItem("i18n_lang");
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => {
      expect(result.current.currentStep).toBe("language");
    });
  });

  it("starts at privacy step when language set but no DB data", async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => {
      expect(result.current.currentStep).toBe("privacy");
    });
  });

  it("starts at tutorial step when privacy is accepted", async () => {
    vi.mocked(getOnboardingValue).mockImplementation(async (key) => {
      if (key === "privacy_accepted") return "true";
      return null;
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => {
      expect(result.current.currentStep).toBe("tutorial");
    });
    expect(useOnboardingStore.getState().privacyAccepted).toBe(true);
  });

  it("starts at name step when tutorial is completed", async () => {
    vi.mocked(getOnboardingValue).mockImplementation(async (key) => {
      if (key === "privacy_accepted") return "true";
      if (key === "tutorial_completed") return "true";
      return null;
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => {
      expect(result.current.currentStep).toBe("name");
    });
    expect(useOnboardingStore.getState().tutorialCompleted).toBe(true);
  });

  it("starts at done when all onboarding data exists", async () => {
    vi.mocked(getOnboardingValue).mockImplementation(async (key) => {
      if (key === "privacy_accepted") return "true";
      if (key === "tutorial_completed") return "true";
      return "Alice";
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => {
      expect(result.current.currentStep).toBe("done");
    });
    expect(useOnboardingStore.getState().userName).toBe("Alice");
  });

  it("advanceLanguage sets step to privacy", async () => {
    localStorage.removeItem("i18n_lang");
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.currentStep).toBe("language"));
    act(() => { result.current.advanceLanguage(); });
    expect(result.current.currentStep).toBe("privacy");
  });

  it("acceptPrivacy saves to DB and advances to tutorial", async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.currentStep).toBe("privacy"));
    await act(async () => {
      await result.current.acceptPrivacy();
    });
    expect(setOnboardingValue).toHaveBeenCalledWith("privacy_accepted", "true");
    expect(result.current.currentStep).toBe("tutorial");
    expect(useOnboardingStore.getState().privacyAccepted).toBe(true);
  });

  it("completeTutorial saves to DB and advances to name", async () => {
    vi.mocked(getOnboardingValue).mockImplementation(async (key) => {
      if (key === "privacy_accepted") return "true";
      return null;
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.currentStep).toBe("tutorial"));
    await act(async () => {
      await result.current.completeTutorial();
    });
    expect(setOnboardingValue).toHaveBeenCalledWith("tutorial_completed", "true");
    expect(result.current.currentStep).toBe("name");
  });

  it("saveName saves to DB and advances to done", async () => {
    vi.mocked(getOnboardingValue).mockImplementation(async (key) => {
      if (key === "privacy_accepted") return "true";
      if (key === "tutorial_completed") return "true";
      return null;
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.currentStep).toBe("name"));
    await act(async () => {
      await result.current.saveName("Bob");
    });
    expect(setOnboardingValue).toHaveBeenCalledWith("user_name", "Bob");
    expect(result.current.currentStep).toBe("done");
    expect(useOnboardingStore.getState().userName).toBe("Bob");
  });

  it("saveName with empty string skips name entry", async () => {
    vi.mocked(getOnboardingValue).mockImplementation(async (key) => {
      if (key === "privacy_accepted") return "true";
      if (key === "tutorial_completed") return "true";
      return null;
    });
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.currentStep).toBe("name"));
    await act(async () => {
      await result.current.saveName("");
    });
    expect(result.current.currentStep).toBe("done");
  });
});
