import { useState, useRef, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import { useOnboarding, useAppUpdate, useNotifications } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { toast } from "@/store/toastStore";
import { SUPPORTED_LOCALES } from "@/i18n";
import { getLogEntries, logError, safeLocalStorageSet } from "@/utils/logger";
import { KofiButton } from "./KofiButton";
import { UpdateAvailableDialog } from "@/components/shared";

declare const __APP_VERSION__: string;
const APP_VERSION = __APP_VERSION__;
const GITHUB_URL = "https://github.com/QuentinGenet/esperanzapp";

const LOCALE_FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  "pt-BR": "🇧🇷",
  nl: "🇳🇱",
  it: "🇮🇹",
};

interface SettingsGeneralSectionProps {
  onReplayTutorial: () => void;
  onShowTerms: () => void;
}

export function SettingsGeneralSection({
  onReplayTutorial,
  onShowTerms,
}: SettingsGeneralSectionProps) {
  const { t, i18n } = useTranslation();
  const { saveName } = useOnboarding();
  const { status: updateStatus, checkForUpdate } = useAppUpdate();
  const { requestPermission, getPermissionStatus, getExactAlarmStatus, openExactAlarmSettings } =
    useNotifications();
  const userName = useOnboardingStore((s) => s.userName);
  const [editName, setEditName] = useState(userName);
  const [diagOpen, setDiagOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean | null>(null);
  const versionTapCount = useRef(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    },
    [],
  );

  useEffect(() => {
    void getPermissionStatus().then(setNotifGranted);
  }, [getPermissionStatus]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    void getExactAlarmStatus().then(setExactAlarmGranted);
  }, [getExactAlarmStatus]);

  const recheckExactAlarm = useCallback(async () => {
    if (Capacitor.getPlatform() !== "android") return;
    const [notifStatus, exactStatus] = await Promise.all([
      getPermissionStatus(),
      getExactAlarmStatus(),
    ]);
    setNotifGranted(notifStatus);
    setExactAlarmGranted(exactStatus);
  }, [getPermissionStatus, getExactAlarmStatus]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let handle: PluginListenerHandle | undefined;
    let disposed = false;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void recheckExactAlarm();
    })
      .then((h) => {
        if (disposed) void h.remove().catch(() => {});
        else handle = h;
      })
      .catch(() => {});
    return () => {
      disposed = true;
      void handle?.remove().catch(() => {});
    };
  }, [recheckExactAlarm]);

  const handleSaveName = () => {
    void saveName(editName)
      .then(() => {
        toast.success(t("common.saved"));
      })
      .catch(() => {
        toast.error(t("common.error"));
      });
  };

  const handleCheckUpdate = () => {
    void checkForUpdate().then((result) => {
      if (result === "available") {
        setUpdateDialogOpen(true);
      } else if (result === "error") {
        toast.error(t("update.updateError"));
      } else {
        toast.success(t("update.upToDate"));
      }
    });
  };

  const handleVersionTap = () => {
    versionTapCount.current += 1;
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    versionTapTimer.current = setTimeout(() => {
      versionTapCount.current = 0;
    }, 2000);
    if (versionTapCount.current >= 5) {
      versionTapCount.current = 0;
      setDiagOpen(true);
    }
  };

  const handleLanguageChange = (value: string) => {
    void i18n.changeLanguage(value);
    safeLocalStorageSet("i18n_lang", value);
    toast.success(t("common.saved"));
  };

  const diagEntries = getLogEntries();
  const diagText =
    diagEntries.length === 0
      ? t("settings.diagNoEntries")
      : diagEntries
          .map((e) => `${e.time} [${e.context}] ${e.name}${e.message ? `: ${e.message}` : ""}`)
          .join("\n");

  const handleCopyDiag = () => {
    void navigator.clipboard
      .writeText(diagText)
      .then(() => {
        toast.success(t("settings.diagCopied"));
      })
      .catch((e: unknown) => {
        logError("SettingsGeneralSection.copyDiag", e);
        toast.error(t("common.error"));
      });
  };

  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {t("export.editName")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
            }}
            label={t("common.name")}
          />
          <Button
            variant="contained"
            onClick={handleSaveName}
            aria-label={t("common.save")}
            sx={{ minHeight: 44, px: 2 }}
          >
            {t("common.save")}
          </Button>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {t("settings.language")}
        </Typography>
        <Select
          fullWidth
          size="small"
          value={i18n.language}
          onChange={(e) => {
            handleLanguageChange(e.target.value);
          }}
          sx={{ mb: 3 }}
          aria-label={t("settings.language")}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <MenuItem key={locale} value={locale}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{LOCALE_FLAGS[locale]}</span>
                <span>{t(`settings.languages.${locale}`)}</span>
              </Box>
            </MenuItem>
          ))}
        </Select>

        {notifGranted !== null && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, mx: 2 }}>
            {t("settings.notifications")}
          </Typography>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            mx: 2,
          }}
        >
          {notifGranted !== null ? (
            <FormControlLabel
              control={
                <Switch
                  checked={notifGranted}
                  onChange={(_e, checked) => {
                    if (checked) {
                      void requestPermission().then(async (granted) => {
                        setNotifGranted(granted);
                        if (!granted && Capacitor.isNativePlatform()) {
                          toast.info(t("settings.notificationsBlocked"));
                          void NativeSettings.openAndroid({
                            option: AndroidSettings.AppNotification,
                          }).catch(() => {});
                        } else if (granted && Capacitor.getPlatform() === "android") {
                          const hasExact = await getExactAlarmStatus();
                          setExactAlarmGranted(hasExact);
                          if (!hasExact) {
                            toast.info(t("settings.exactAlarmRedirect"));
                            await new Promise<void>((r) => setTimeout(r, 600));
                            void openExactAlarmSettings();
                          }
                        }
                      });
                    } else {
                      toast.info(t("settings.notificationsDisableHint"));
                    }
                  }}
                  slotProps={{ input: { "aria-label": t("settings.notifications") } }}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  {t(notifGranted ? "common.enabled" : "common.disabled")}
                </Typography>
              }
              sx={{ m: 0 }}
            />
          ) : (
            <Box />
          )}
          <Button
            variant="text"
            onClick={onReplayTutorial}
            sx={{
              px: 0,
              minHeight: 36,
              py: 0.5,
              textTransform: "none",
              fontWeight: 400,
              color: "text.primary",
            }}
          >
            {t("settings.replayTutorial")}
          </Button>
        </Box>

        {notifGranted && exactAlarmGranted === false && Capacitor.getPlatform() === "android" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mx: 2,
              mb: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1, mr: 1 }}>
              {t("settings.exactAlarmHint")}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                toast.info(t("settings.exactAlarmRedirect"));
                setTimeout(() => {
                  void openExactAlarmSettings();
                }, 600);
              }}
              sx={{ flexShrink: 0, minHeight: 32, textTransform: "none", fontSize: "0.75rem" }}
            >
              {t("settings.exactAlarmBtn")}
            </Button>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <KofiButton />
          <Button
            variant="text"
            onClick={onShowTerms}
            sx={{
              justifyContent: "flex-start",
              px: 0,
              minHeight: 36,
              py: 0.5,
              textTransform: "none",
              fontWeight: 400,
              mt: 2,
              color: "text.primary",
            }}
          >
            {t("settings.terms")}
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ cursor: "default", userSelect: "none" }}
              onClick={handleVersionTap}
            >
              {t("settings.version")} {APP_VERSION}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              |
            </Typography>
            <Button
              variant="text"
              disabled={updateStatus === "checking"}
              onClick={handleCheckUpdate}
              sx={{
                p: 0,
                minHeight: 0,
                minWidth: 0,
                textTransform: "none",
                fontWeight: 400,
                color: "text.secondary",
                fontSize: "0.75rem",
                lineHeight: "inherit",
              }}
              startIcon={updateStatus === "checking" ? <CircularProgress size={12} /> : null}
            >
              {updateStatus === "checking" ? t("update.checking") : t("update.checkBtn")}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{ fontSize: "inherit", color: "inherit" }}
            >
              {t("settings.sourceCode")}
            </Link>
            {" "}{t("app.by")} Quentin Genet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("settings.license")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("settings.sqlcipher")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("settings.sqlcipherNote")}
          </Typography>
        </Box>
      </Box>

      <UpdateAvailableDialog
        open={updateDialogOpen}
        onClose={() => {
          setUpdateDialogOpen(false);
        }}
      />

      <Dialog
        open={diagOpen}
        onClose={() => {
          setDiagOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t("settings.diagTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {t("settings.diagSubtitle")}
          </Typography>
          <Box
            component="pre"
            sx={{
              fontSize: "0.65rem",
              overflowX: "auto",
              bgcolor: "action.hover",
              p: 1,
              borderRadius: 1,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {diagText}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDiagOpen(false);
            }}
          >
            {t("common.close")}
          </Button>
          <Button variant="contained" onClick={handleCopyDiag}>
            {t("settings.diagCopy")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
