import { Suspense, lazy, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { useTranslation } from "react-i18next";
import { AppToast } from "@/components/shared/AppToast";
import { BottomNav } from "@/components/shared/BottomNav";
import { UpdateAvailableDialog } from "@/components/shared/UpdateAvailableDialog";
import {
  LanguageSelector,
  PrivacyModal,
  OnboardingSlider,
  UserNameInput,
} from "@/components/onboarding";
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const Milestones = lazy(() =>
  import("@/pages/Milestones").then((m) => ({ default: m.Milestones })),
);
const Treatments = lazy(() =>
  import("@/pages/Treatments").then((m) => ({ default: m.Treatments })),
);
const History = lazy(() => import("@/pages/History").then((m) => ({ default: m.History })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
import { useOnboarding, useNotifications, useAppUpdate } from "@/hooks";
import { getAllTreatments } from "@/db";
import { toast } from "@/store/toastStore";
import {
  NOTIF_DOMAIN_OFFSET,
  getNotificationId,
  getLastDayNotificationIds,
} from "@/hooks/useNotifications";
import { theme } from "@/theme";
import { logError, safeLocalStorageSet } from "@/utils/logger";
import { rescheduleAllMilestoneNotifications } from "@/utils/milestoneNotifications";
import type { SupportedLocale } from "@/i18n";
import type { NavTab } from "@/types";

// The native receiver restores notifications after reboot. This sync also repairs drift
// between the database and the notification plugin whenever the app starts.
function AppStartRescheduler() {
  const { t } = useTranslation();
  const { rescheduleAll, scheduleReminder, getExactAlarmStatus } = useNotifications();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const guard = { cancelled: false };
    void (async () => {
      try {
        const treatments = await getAllTreatments();
        const exactAlarmOk = await getExactAlarmStatus();
        await rescheduleAll(treatments);
        if (!guard.cancelled && !exactAlarmOk && treatments.some((tr) => tr.reminderEnabled)) {
          toast.info(t("treatments.reminderAlarmSettingsNeeded"));
        }
      } catch {
        // Treatment notification failures must not prevent the app from starting.
      }
      // Runs independently: rescheduleAllMilestoneNotifications has its own internal try/catch
      // and must not be skipped if the treatment reschedule above throws.
      await rescheduleAllMilestoneNotifications();
    })();
    return () => {
      guard.cancelled = true;
    };
  }, [rescheduleAll, getExactAlarmStatus, t]);

  // Renew "last day of month" one-shots when they fire while the app is in foreground.
  // Background/killed case is handled by AppStartRescheduler on next launch.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: PluginListenerHandle | undefined;
    let disposed = false;
    void LocalNotifications.addListener("localNotificationReceived", (notif) => {
      if (notif.id < NOTIF_DOMAIN_OFFSET.treatments || notif.id >= NOTIF_DOMAIN_OFFSET.milestones)
        return;
      void (async () => {
        try {
          const treatments = await getAllTreatments();
          const treatment = treatments.find(
            (t) =>
              getNotificationId("treatments", t.id) === notif.id ||
              getLastDayNotificationIds(t.id).includes(notif.id),
          );
          if (treatment?.frequency === "monthly" && treatment.reminderDay === 0) {
            await scheduleReminder(treatment);
          }
        } catch {
          // Notification failures must not crash.
        }
      })();
    })
      .then((h) => {
        if (disposed)
          void h.remove().catch((e: unknown) => {
            logError("AppStartRescheduler.notifReceived.removeDisposed", e);
          });
        else handle = h;
      })
      .catch((e: unknown) => {
        logError("AppStartRescheduler.notifReceived", e);
      });
    return () => {
      disposed = true;
      void handle?.remove().catch((e: unknown) => {
        logError("AppStartRescheduler.notifReceived.remove", e);
      });
    };
  }, [scheduleReminder]);

  return null;
}

function AppUpdateChecker() {
  const { checkForUpdate } = useAppUpdate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let mounted = true;
    const timer = setTimeout(() => {
      void checkForUpdate().then((result) => {
        if (mounted && result === "available") setOpen(true);
      });
    }, 3000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [checkForUpdate]);

  return <UpdateAvailableDialog open={open} onClose={() => setOpen(false)} />;
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
  const { currentStep, acceptPrivacy, advanceLanguage, completeTutorial, saveName } =
    useOnboarding();
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const activeTabRef = useRef<NavTab>("home");
  useEffect(() => {
    activeTabRef.current = activeTab;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: PluginListenerHandle | undefined;
    let disposed = false;
    void LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const notifId = action.notification.id;
      if (notifId >= NOTIF_DOMAIN_OFFSET.milestones) {
        setActiveTab("home");
      } else if (notifId >= NOTIF_DOMAIN_OFFSET.treatments) {
        setActiveTab("treatments");
      }
    })
      .then((h) => {
        if (disposed) {
          void h.remove().catch((e: unknown) => {
            logError("AppContent.notificationActionPerformed.removeDisposed", e);
          });
        } else {
          handle = h;
        }
      })
      .catch((e: unknown) => {
        logError("AppContent.notificationActionPerformed", e);
      });
    return () => {
      disposed = true;
      void handle?.remove().catch((e: unknown) => {
        logError("AppContent.notificationActionPerformed.remove", e);
      });
    };
  }, []);

  // Stable listener: reads activeTab via ref so it does not reinstall on every tab change.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: PluginListenerHandle | undefined;
    let disposed = false;

    void CapApp.addListener("backButton", ({ canGoBack }) => {
      if (activeTabRef.current !== "home") {
        setActiveTab("home");
      } else if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.exitApp().catch((e: unknown) => {
          logError("AppContent.backButton.exitApp", e);
        });
      }
    })
      .then((handle) => {
        if (disposed) {
          void handle.remove().catch((e: unknown) => {
            logError("AppContent.backButton.removeDisposed", e);
          });
        } else {
          listener = handle;
        }
      })
      .catch((e: unknown) => {
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
  }, []);

  if (currentStep === "privacy") {
    return (
      <PrivacyModal
        open
        onAccept={() => {
          void acceptPrivacy();
        }}
      />
    );
  }
  if (currentStep === "language") {
    return (
      <LanguageSelector
        onSelect={(locale: SupportedLocale) => {
          safeLocalStorageSet("i18n_lang", locale);
          advanceLanguage();
        }}
      />
    );
  }
  if (currentStep === "tutorial") {
    return (
      <OnboardingSlider
        onComplete={() => {
          void completeTutorial();
        }}
        onSkip={() => {
          void completeTutorial();
        }}
      />
    );
  }
  if (currentStep === "name") {
    return (
      <UserNameInput
        onSave={(name) => {
          void saveName(name);
        }}
        onSkip={() => {
          void saveName("");
        }}
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
      <Suspense
        fallback={
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "calc(100dvh - 80px)",
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        {pages[activeTab]}
      </Suspense>
      <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </Box>
    </Box>
  );
}

function SplashHider() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void SplashScreen.hide();
  }, []);
  return null;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense
        fallback={
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100dvh",
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <SplashHider />
        <AppContent />
        <AppToast />
      </Suspense>
    </ThemeProvider>
  );
}
