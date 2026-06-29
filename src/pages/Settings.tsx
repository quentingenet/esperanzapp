import { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { OnboardingSlider, PrivacyModal } from "@/components/onboarding";
import { DataExportSection, SettingsGeneralSection } from "@/components/settings";

export function Settings() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [termsOpen, setTermsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.default", borderBottom: 1, borderColor: "divider", pt: "env(safe-area-inset-top)" }}>
        <Tabs value={tab} onChange={(_, v: number) => { setTab(v); }} variant="fullWidth">
          <Tab label={t("settings.tabs.settings")} aria-label={t("settings.tabs.settings")} />
          <Tab label={t("settings.tabs.data")} aria-label={t("settings.tabs.data")} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <SettingsGeneralSection
          onReplayTutorial={() => { setTutorialOpen(true); }}
          onShowTerms={() => { setTermsOpen(true); }}
        />
      )}
      {tab === 1 && <DataExportSection />}

      <PrivacyModal open={termsOpen} onAccept={() => { setTermsOpen(false); }} readOnly />

      <Dialog open={tutorialOpen} fullScreen>
        <OnboardingSlider onComplete={() => { setTutorialOpen(false); }} onSkip={() => { setTutorialOpen(false); }} />
      </Dialog>
    </Box>
  );
}
