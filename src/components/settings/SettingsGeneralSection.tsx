import { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useOnboarding, useAppUpdate } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { toast } from "@/store/toastStore";
import { SUPPORTED_LOCALES } from "@/i18n";
import { getLogEntries, logError } from "@/utils/logger";

declare const __APP_VERSION__: string;
const APP_VERSION = __APP_VERSION__;
const GITHUB_URL = "https://github.com/QuentinGenet/esperanzapp";

const LOCALE_FLAGS: Record<string, string> = {
  fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", "pt-BR": "🇧🇷", nl: "🇳🇱", it: "🇮🇹",
};

interface SettingsGeneralSectionProps {
  onReplayTutorial: () => void;
  onShowTerms: () => void;
}

export function SettingsGeneralSection({ onReplayTutorial, onShowTerms }: SettingsGeneralSectionProps) {
  const { t, i18n } = useTranslation();
  const { saveName } = useOnboarding();
  const { status: updateStatus, checkForUpdate, openUpdate } = useAppUpdate();
  const userName = useOnboardingStore((s) => s.userName);
  const [editName, setEditName] = useState(userName);
  const [diagOpen, setDiagOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const versionTapCount = useRef(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (versionTapTimer.current) clearTimeout(versionTapTimer.current); }, []);

  const handleSaveName = () => {
    void saveName(editName)
      .then(() => { toast.success(t("common.saved")); })
      .catch(() => { toast.error(t("common.error")); });
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
    versionTapTimer.current = setTimeout(() => { versionTapCount.current = 0; }, 2000);
    if (versionTapCount.current >= 5) {
      versionTapCount.current = 0;
      setDiagOpen(true);
    }
  };

  const handleLanguageChange = (value: string) => {
    void i18n.changeLanguage(value);
    localStorage.setItem("i18n_lang", value);
    toast.success(t("common.saved"));
  };

  const diagEntries = getLogEntries();
  const diagText = diagEntries.length === 0
    ? t("settings.diagNoEntries")
    : diagEntries.map((e) => `${e.time} [${e.context}] ${e.name}${e.message ? `: ${e.message}` : ""}`).join("\n");

  const handleCopyDiag = () => {
    void navigator.clipboard.writeText(diagText)
      .then(() => { toast.success(t("settings.diagCopied")); })
      .catch((e: unknown) => { logError("SettingsGeneralSection.copyDiag", e); toast.error(t("common.error")); });
  };

  return (
    <>
    <Box sx={{ px: 2, pt: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t("export.editName")}</Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        <TextField fullWidth size="small" value={editName} onChange={(e) => { setEditName(e.target.value); }} label={t("common.name")} />
        <Button variant="contained" onClick={handleSaveName} aria-label={t("common.save")} sx={{ minHeight: 44, px: 2 }}>{t("common.save")}</Button>
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t("settings.language")}</Typography>
      <Select
        fullWidth
        size="small"
        value={i18n.language}
        onChange={(e) => { handleLanguageChange(e.target.value); }}
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

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Button variant="text" onClick={onReplayTutorial} sx={{ justifyContent: "flex-start", px: 0, minHeight: 44, textTransform: "none", fontWeight: 400, color: "text.primary" }}>
          {t("settings.replayTutorial")}
        </Button>
        <Button variant="text" onClick={onShowTerms} sx={{ justifyContent: "flex-start", px: 0, minHeight: 44, textTransform: "none", fontWeight: 400, color: "text.primary" }}>
          {t("settings.terms")}
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, cursor: "default", userSelect: "none" }}
          onClick={handleVersionTap}
        >
          {t("settings.version")} {APP_VERSION}
        </Typography>
        <Button
          variant="text"
          disabled={updateStatus === "checking"}
          onClick={handleCheckUpdate}
          sx={{ justifyContent: "flex-start", px: 0, minHeight: 36, textTransform: "none", fontWeight: 400, color: "text.secondary", fontSize: "0.75rem" }}
          startIcon={updateStatus === "checking" ? <CircularProgress size={12} /> : null}
        >
          {updateStatus === "checking" ? t("update.checking") : t("update.checkBtn")}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t("settings.license")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" underline="none" sx={{ fontSize: "inherit", color: "inherit" }}>{t("settings.sourceCode")}</Link>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("app.by")} Quentin Genet
        </Typography>
      </Box>
    </Box>

    <Dialog open={updateDialogOpen} onClose={() => { setUpdateDialogOpen(false); }} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("update.available")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">{t("update.availableBody")}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={() => { setUpdateDialogOpen(false); }}>{t("update.later")}</Button>
        <Button variant="contained" onClick={() => { setUpdateDialogOpen(false); void openUpdate(); }}>
          {t("update.updateNow")}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={diagOpen} onClose={() => { setDiagOpen(false); }} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Diagnostics</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          time · context · error name (no user data stored)
        </Typography>
        <Box
          component="pre"
          sx={{ fontSize: "0.65rem", overflowX: "auto", bgcolor: "action.hover", p: 1, borderRadius: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
        >
          {diagText}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setDiagOpen(false); }}>{t("common.close")}</Button>
        <Button variant="contained" onClick={handleCopyDiag}>Copy</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
