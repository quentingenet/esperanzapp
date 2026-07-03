import { Suspense, lazy, useEffect, useState } from "react";
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
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { AppToast, BottomNav } from "@/components/shared";
import { LanguageSelector, PrivacyModal, OnboardingSlider, UserNameInput } from "@/components/onboarding";
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const Milestones = lazy(() => import("@/pages/Milestones").then((m) => ({ default: m.Milestones })));
const Treatments = lazy(() => import("@/pages/Treatments").then((m) => ({ default: m.Treatments })));
const History = lazy(() => import("@/pages/History").then((m) => ({ default: m.History })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
import { useOnboarding, useNotifications, useAppUpdate } from "@/hooks";
import { getAllTreatments } from "@/db";
import { theme } from "@/theme";
import { logError } from "@/utils/logger";
import type { SupportedLocale } from "@/i18n";
import type { NavTab } from "@/types";

// The native receiver restores notifications after reboot. This sync also repairs drift
// between the database and the notification plugin whenever the app starts.
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
        // Notification failures must not prevent the app from starting.
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
      void checkForUpdate().then((result) => { if (result === "available") setOpen(true); });
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: PluginListenerHandle | undefined;
    let disposed = false;

    void CapApp.addListener("backButton", ({ canGoBack }) => {
      if (activeTab !== "home") {
        setActiveTab("home");
      } else if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.exitApp().catch((e: unknown) => {
          logError("AppContent.backButton.exitApp", e);
        });
      }
    }).then((handle) => {
      if (disposed) {
        void handle.remove().catch((e: unknown) => {
          logError("AppContent.backButton.removeDisposed", e);
        });
      } else {
        listener = handle;
      }
    }).catch((e: unknown) => {
      logError("AppContent.backButton.addListener", e);
    });

    return () => {
      disposed = true;
      if (listener) {
        void listener.remove().catch((e: unknown) => {
          logError("AppContent.backButton.removeListener", e);
        });
      }
    };
  }, [activeTab]);

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
