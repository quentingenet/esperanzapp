import { Suspense, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { AppToast, BottomNav } from "@/components/shared";
import { LanguageSelector, PrivacyModal, OnboardingSlider, UserNameInput } from "@/components/onboarding";
import { Home, Milestones, Treatments, History, Settings } from "@/pages";
import { useOnboarding, useNotifications, useAppUpdate } from "@/hooks";
import { getAllTreatments } from "@/db";
import { theme } from "@/theme";
import type { SupportedLocale } from "@/i18n";
import type { NavTab } from "@/types";

// On Android, @capacitor/local-notifications ships a native LocalNotificationRestoreReceiver
// that reschedules stored notifications on BOOT_COMPLETED without requiring the app to open.
// This component is a complementary safeguard: it re-syncs reminders against the current DB
// state every time the app is opened, catching any drift (e.g. after a data import or if the
// plugin's SharedPreferences were cleared). It is NOT a substitute for the native receiver.
function AppStartRescheduler() {
  const { scheduleReminder } = useNotifications();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void (async () => {
      try {
        const treatments = await getAllTreatments();
        for (const t of treatments.filter((tr) => tr.reminderEnabled)) {
          await scheduleReminder(t);
        }
      } catch {
        // Notifications are best-effort: scheduling failure must not crash the app.
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function AppUpdateChecker() {
  const { t } = useTranslation();
  const { checkForUpdate, openUpdate } = useAppUpdate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const timer = setTimeout(() => {
      void checkForUpdate().then((available) => { if (available) setOpen(true); });
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("update.available")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">{t("update.availableBody")}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={() => { setOpen(false); }}>{t("update.later")}</Button>
        <Button variant="contained" onClick={() => { setOpen(false); void openUpdate(); }}>
          {t("update.updateNow")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Visible only when running in a browser (Capacitor platform "web").
// On any native Android/iOS build, getPlatform() returns "android" or "ios" and this
// component renders nothing. Never add a production-only gate here: "web" already
// guarantees we are not on a native build.
function DevWebBanner() {
  if (Capacitor.getPlatform() !== "web") return null;
  return (
    <Box
      role="status"
      sx={{
        bgcolor: "warning.main",
        color: "warning.contrastText",
        px: 2,
        py: 0.5,
        fontSize: 11,
        textAlign: "center",
        letterSpacing: 0.2,
      }}
    >
      Web mode - no real persistence. Use a native Android build to validate data storage.
    </Box>
  );
}

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
      <DevWebBanner />
      <AppStartRescheduler />
      <AppUpdateChecker />
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
