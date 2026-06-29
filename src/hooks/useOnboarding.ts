import { useCallback, useEffect, useState } from "react";
import { getOnboardingValue, setOnboardingValue } from "@/db";
import { useOnboardingStore } from "@/store/onboardingStore";

export type OnboardingStep = "privacy" | "language" | "tutorial" | "name" | "done";

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("done");
  const { setPrivacyAccepted, setTutorialCompleted, setUserName } = useOnboardingStore();

  useEffect(() => {
    const guard: { cancelled: boolean } = { cancelled: false };

    async function init() {
      const langSet = localStorage.getItem("i18n_lang");
      if (!langSet) {
        setCurrentStep("language");
        return;
      }

      const privacy = await getOnboardingValue("privacy_accepted");
      if (guard.cancelled) return;
      if (!privacy) {
        setCurrentStep("privacy");
        return;
      }
      setPrivacyAccepted(true);

      const tutorial = await getOnboardingValue("tutorial_completed");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (guard.cancelled) return;
      if (!tutorial) {
        setCurrentStep("tutorial");
        return;
      }
      setTutorialCompleted(true);

      const name = await getOnboardingValue("user_name");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (guard.cancelled) return;
      if (name !== null) {
        setUserName(name);
        setCurrentStep("done");
      } else {
        setCurrentStep("name");
      }
    }

    void init();
    return () => {
      guard.cancelled = true;
    };
  }, [setPrivacyAccepted, setTutorialCompleted, setUserName]);

  const acceptPrivacy = useCallback(async () => {
    await setOnboardingValue("privacy_accepted", "true");
    setPrivacyAccepted(true);
    setCurrentStep("tutorial");
  }, [setPrivacyAccepted]);

  const advanceLanguage = useCallback(() => {
    setCurrentStep("privacy");
  }, []);

  const completeTutorial = useCallback(async () => {
    await setOnboardingValue("tutorial_completed", "true");
    setTutorialCompleted(true);
    setCurrentStep("name");
  }, [setTutorialCompleted]);

  const saveName = useCallback(
    async (name: string) => {
      await setOnboardingValue("user_name", name);
      setUserName(name);
      setCurrentStep("done");
    },
    [setUserName],
  );

  return { currentStep, acceptPrivacy, advanceLanguage, completeTutorial, saveName };
}
