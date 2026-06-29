import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { OnboardingSlider, PrivacyModal } from "@/components/onboarding";
import { useExport, useOnboarding } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { SUPPORTED_LOCALES } from "@/i18n";

const APP_VERSION = "0.1.0";
const GITHUB_URL = "https://github.com/QuentinGenet/esperanzapp";

export function Export() {
  const { t, i18n } = useTranslation();
  const { exportJSON, exportCSV, importJSON, importCSV } = useExport();
  const { saveName } = useOnboarding();
  const userName = useOnboardingStore((s) => s.userName);
  const [editName, setEditName] = useState(userName);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"json" | "csv">("json");
  const [warnOpen, setWarnOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const triggerImport = (type: "json" | "csv") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "json" ? ".json" : ".csv";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) { setImportFile(file); setImportType(type); setWarnOpen(true); }
    };
    input.click();
  };

  const confirmImport = () => {
    if (!importFile) return;
    void (importType === "json" ? importJSON(importFile) : importCSV(importFile));
    setWarnOpen(false);
    setImportFile(null);
  };

  return (
    <Box sx={{ px: 2, pt: "calc(env(safe-area-inset-top) + 16px)", pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t("export.title")}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Button variant="outlined" fullWidth onClick={() => { void exportJSON(); }} sx={{ minHeight: 48 }}>{t("export.exportJSON")}</Button>
        <Button variant="outlined" fullWidth onClick={() => { void exportCSV(); }} sx={{ minHeight: 48 }}>{t("export.exportCSV")}</Button>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("export.privacyWarningTitle")}</Typography>
          <Typography variant="body2">{t("export.privacyWarningBody")}</Typography>
        </Alert>
        <Button variant="outlined" fullWidth onClick={() => { triggerImport("json"); }} sx={{ minHeight: 48 }}>{t("export.importJSON")}</Button>
        <Button variant="outlined" fullWidth onClick={() => { triggerImport("csv"); }} sx={{ minHeight: 48 }}>{t("export.importCSV")}</Button>
      </Box>
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t("settings.title")}</Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField fullWidth size="small" value={editName} onChange={(e) => { setEditName(e.target.value); }} label={t("export.editName")} />
        <Button variant="contained" onClick={() => { void saveName(editName); }} aria-label={t("common.save")} sx={{ minHeight: 44, px: 2 }}>{t("common.save")}</Button>
      </Box>
      <Select fullWidth size="small" value={i18n.language} onChange={(e) => { void i18n.changeLanguage(e.target.value); localStorage.setItem("i18n_lang", e.target.value); }} sx={{ mb: 3 }}>
        {SUPPORTED_LOCALES.map((locale) => (
          <MenuItem key={locale} value={locale}>{t(`settings.languages.${locale}`)}</MenuItem>
        ))}
      </Select>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Button variant="text" onClick={() => { setTutorialOpen(true); }} sx={{ justifyContent: "flex-start", px: 0, minHeight: 44, textTransform: "none", fontWeight: 400, color: "text.primary" }}>
          {t("settings.replayTutorial")}
        </Button>
        <Button variant="text" onClick={() => { setTermsOpen(true); }} sx={{ justifyContent: "flex-start", px: 0, minHeight: 44, textTransform: "none", fontWeight: 400, color: "text.primary" }}>
          {t("settings.terms")}
        </Button>
        <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ minHeight: 44, display: "flex", alignItems: "center" }}>{t("settings.sourceCode")}</Link>
        <Typography variant="caption" color="text.secondary">{t("settings.version")} {APP_VERSION}</Typography>
        <Typography variant="caption" color="text.secondary">{t("settings.license")} · {t("app.by")} Quentin Genet</Typography>
      </Box>

      <PrivacyModal open={termsOpen} onAccept={() => { setTermsOpen(false); }} readOnly />

      <Dialog open={tutorialOpen} fullScreen>
        <OnboardingSlider
          onComplete={() => { setTutorialOpen(false); }}
          onSkip={() => { setTutorialOpen(false); }}
        />
      </Dialog>

      <Dialog open={warnOpen} onClose={() => { setWarnOpen(false); }}>
        <DialogTitle>{t("export.importWarningTitle")}</DialogTitle>
        <DialogContent><Typography>{t("export.importWarningBody")}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => { setWarnOpen(false); }}>{t("common.cancel")}</Button>
          <Button variant="outlined" color="warning" onClick={confirmImport}>{t("export.importConfirm")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
