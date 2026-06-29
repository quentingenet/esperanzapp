import { Suspense, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppToast, BottomNav } from "@/components/shared";
import { LanguageSelector, PrivacyModal, OnboardingSlider, UserNameInput } from "@/components/onboarding";
import { Home, Milestones, Treatments, History, Settings } from "@/pages";
import { useOnboarding } from "@/hooks";
import { theme } from "@/theme";
import type { SupportedLocale } from "@/i18n";
import type { NavTab } from "@/types";

function AppContent() {
  const { currentStep, acceptPrivacy, advanceLanguage, completeTutorial, saveName } = useOnboarding();
  const [activeTab, setActiveTab] = useState<NavTab>("home");

  if (currentStep === "privacy") {
    return <PrivacyModal open onAccept={() => { void acceptPrivacy(); }} />;
  }
  if (currentStep === "language") {
    return (
      <LanguageSelector
        onSelect={(locale: SupportedLocale) => {
          localStorage.setItem("i18n_lang", locale);
          advanceLanguage();
        }}
      />
    );
  }
  if (currentStep === "tutorial") {
    return (
      <OnboardingSlider
        onComplete={() => { void completeTutorial(); }}
        onSkip={() => { void completeTutorial(); }}
      />
    );
  }
  if (currentStep === "name") {
    return (
      <UserNameInput
        onSave={(name) => { void saveName(name); }}
        onSkip={() => { void saveName(""); }}
      />
    );
  }

  const pages: Record<NavTab, React.ReactNode> = {
    home: <Home />,
    milestones: <Milestones />,
    treatments: <Treatments />,
    history: <History />,
    settings: <Settings />,
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      {pages[activeTab]}
      <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100dvh" }}>
          <CircularProgress />
        </Box>
      }>
        <AppContent />
        <AppToast />
      </Suspense>
    </ThemeProvider>
  );
}
