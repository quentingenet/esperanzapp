import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import SvgIcon from "@mui/material/SvgIcon";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useExport, useHabits, useNotifications, useTreatments } from "@/hooks";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import { toast } from "@/store/toastStore";
import { getImportErrorTranslationKey } from "@/utils/importErrorMessage";
import { logError } from "@/utils/logger";

const MIN_PASSWORD_LENGTH = 8;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

const EYE_PATH = "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z";
const EYE_OFF_PATH = "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z";

export function DataExportSection() {
  const { t } = useTranslation();
  const { exportJSON, exportCSV, saveJSON, saveCSV, importJSON, importCSV, detectEncrypted } = useExport();
  const { loadHabits } = useHabits();
  const { loadTreatments } = useTreatments();
  const { rescheduleAll, requestPermission } = useNotifications();

  const [exportOpen, setExportOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [useCSVExport, setUseCSVExport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"json" | "csv">("json");
  const [warnOpen, setWarnOpen] = useState(false);

  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");

  const [importPasswordOpen, setImportPasswordOpen] = useState(false);
  const [importPassword, setImportPassword] = useState("");

  const [showExportPwd, setShowExportPwd] = useState(false);
  const [showExportPwdConfirm, setShowExportPwdConfirm] = useState(false);
  const [showImportPwd, setShowImportPwd] = useState(false);

  const passwordTooShort = exportPassword.length > 0 && exportPassword.length < MIN_PASSWORD_LENGTH;
  const passwordMismatch = exportPasswordConfirm.length > 0 && exportPassword !== exportPasswordConfirm;
  const exportPasswordValid =
    exportPassword.length >= MIN_PASSWORD_LENGTH && exportPassword === exportPasswordConfirm;
  const exportDisabled = encryptExport && !exportPasswordValid;

  const resolvedExportPassword = encryptExport ? exportPassword : undefined;

  const handleShare = () => {
    void (useCSVExport ? exportCSV(resolvedExportPassword) : exportJSON(resolvedExportPassword))
      .then((outcome) => {
        if (outcome === "filesystem-error") toast.error(t("export.filesystemError"));
      })
      .catch((e: unknown) => { logError("DataExportSection.share", e); toast.error(t("export.filesystemError")); });
    setExportOpen(false);
    resetExportEncryptState();
  };

  const handleSaveClick = () => {
    setExportOpen(false);
    setSaveConfirmOpen(true);
  };

  const confirmSave = async () => {
    try {
      const outcome = await (useCSVExport ? saveCSV(resolvedExportPassword) : saveJSON(resolvedExportPassword));
      setSaveConfirmOpen(false);
      resetExportEncryptState();
      if (outcome === "ok") toast.success(t("export.saveSuccess"));
      else if (outcome === "documents-unavailable") toast.error(t("export.documentsUnavailable"));
      else toast.error(t("export.filesystemError"));
    } catch (e: unknown) {
      logError("DataExportSection.confirmSave", e);
      setSaveConfirmOpen(false);
      resetExportEncryptState();
      toast.error(t("export.filesystemError"));
    }
  };

  const resetExportEncryptState = () => {
    setEncryptExport(false);
    setExportPassword("");
    setExportPasswordConfirm("");
    setShowExportPwd(false);
    setShowExportPwdConfirm(false);
  };

  const triggerImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "json" && ext !== "csv") return;
      if (file.size > MAX_IMPORT_BYTES) {
        toast.error(t("export.importFileTooLarge"));
        return;
      }
      setImportFile(file);
      setImportType(ext);
      setImportOpen(false);
      void detectEncrypted(file).then((encrypted) => {
        if (encrypted) {
          setImportPassword("");
          setImportPasswordOpen(true);
        } else {
          setWarnOpen(true);
        }
      }).catch((e: unknown) => {
        logError("DataExportSection.detectEncrypted", e);
        toast.error(t("common.error"));
      });
    };
    input.click();
  };

  const handleImportPasswordConfirm = () => {
    setImportPasswordOpen(false);
    setShowImportPwd(false);
    setWarnOpen(true);
  };

  const confirmImport = async () => {
    if (!importFile || isImporting) return;
    const file = importFile;
    const type = importType;
    const password = importPassword || undefined;
    setIsImporting(true);
    setWarnOpen(false);
    setImportFile(null);
    setImportPassword("");
    try {
      await (type === "json" ? importJSON(file, password) : importCSV(file, password));
      // Show success immediately after import completes, before UI refresh.
      // A refresh failure must never mask a successful import with an error toast.
      toast.success(t("export.importSuccess"));
      try {
        await Promise.all([loadHabits(), loadTreatments()]);
        // Notification rescheduling is best-effort: never block the success path
        const freshTreatments = useTreatmentsStore.getState().treatments;
        const hasTreatmentsWithReminder = freshTreatments.some((tr) => tr.reminderEnabled);
        if (hasTreatmentsWithReminder) {
          const granted = await requestPermission();
          if (!granted) {
            toast.info(t("export.importReschedulePermissionDenied"));
          }
          await rescheduleAll(freshTreatments);
        }
      } catch (e) {
        logError("DataExportSection.refreshAfterImport", e);
        // Import succeeded; only the UI refresh failed. Warn without blocking success.
        toast.info(t("export.importRefreshFailed"));
      }
    } catch (e) {
      logError("DataExportSection.confirmImport", e);
      toast.error(t(getImportErrorTranslationKey(e)));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 3, justifyContent: "center", pt: 6, px: 2 }}>
        <Button variant="outlined" onClick={() => { setExportOpen(true); }} sx={{ minHeight: 52, minWidth: 130 }}>
          {t("export.exportBtn")}
        </Button>
        <Button variant="outlined" disabled={isImporting} onClick={() => { setImportOpen(true); }} sx={{ minHeight: 52, minWidth: 130 }}>
          {t("export.importBtn")}
        </Button>
      </Box>

      <Dialog open={exportOpen} onClose={() => { setExportOpen(false); resetExportEncryptState(); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("export.exportBtn")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: useCSVExport ? 400 : 700, color: useCSVExport ? "text.secondary" : "primary.main" }}>JSON</Typography>
            <Switch checked={useCSVExport} onChange={(e) => { setUseCSVExport(e.target.checked); }} />
            <Typography variant="body2" sx={{ fontWeight: useCSVExport ? 700 : 400, color: useCSVExport ? "primary.main" : "text.secondary" }}>CSV</Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={encryptExport}
                onChange={(e) => {
                  setEncryptExport(e.target.checked);
                  if (!e.target.checked) {
                    setExportPassword("");
                    setExportPasswordConfirm("");
                  }
                }}
              />
            }
            label={t("export.encryptSwitch")}
            sx={{ mb: 1 }}
          />

          {encryptExport && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1, mb: 1 }}>
              <TextField
                fullWidth
                type={showExportPwd ? "text" : "password"}
                label={t("export.encryptPassword")}
                value={exportPassword}
                onChange={(e) => { setExportPassword(e.target.value); }}
                error={passwordTooShort}
                helperText={passwordTooShort ? t("export.encryptPasswordMinLength") : undefined}
                size="small"
                slotProps={{ input: { endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => { setShowExportPwd((v) => !v); }} onMouseDown={(e) => { e.preventDefault(); }} edge="end" size="small" aria-label={t("common.showPassword")}>
                      <SvgIcon fontSize="small" aria-hidden="true"><path d={showExportPwd ? EYE_OFF_PATH : EYE_PATH} /></SvgIcon>
                    </IconButton>
                  </InputAdornment>
                ) } }}
              />
              <TextField
                fullWidth
                type={showExportPwdConfirm ? "text" : "password"}
                label={t("export.encryptPasswordConfirm")}
                value={exportPasswordConfirm}
                onChange={(e) => { setExportPasswordConfirm(e.target.value); }}
                error={passwordMismatch}
                helperText={passwordMismatch ? t("export.encryptPasswordMismatch") : undefined}
                size="small"
                slotProps={{ input: { endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => { setShowExportPwdConfirm((v) => !v); }} onMouseDown={(e) => { e.preventDefault(); }} edge="end" size="small" aria-label={t("common.showPassword")}>
                      <SvgIcon fontSize="small" aria-hidden="true"><path d={showExportPwdConfirm ? EYE_OFF_PATH : EYE_PATH} /></SvgIcon>
                    </IconButton>
                  </InputAdornment>
                ) } }}
              />
            </Box>
          )}

          <Alert severity="warning" sx={{ borderRadius: 2, mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("export.privacyWarningTitle")}</Typography>
            <Typography variant="body2">{t("export.privacyWarningBody")}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {encryptExport ? t("export.encryptWarning") : t("export.fileProtectionHint")}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", gap: 1, px: 2, pb: 2 }}>
          <Button fullWidth variant="contained" onClick={handleShare} disabled={exportDisabled} sx={{ minHeight: 48 }}>{t("export.shareBtn")}</Button>
          <Button fullWidth variant="outlined" onClick={handleSaveClick} disabled={exportDisabled} sx={{ minHeight: 48 }}>{t("export.saveBtn")}</Button>
          <Button fullWidth onClick={() => { setExportOpen(false); resetExportEncryptState(); }}>{t("common.cancel")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveConfirmOpen} onClose={() => { setSaveConfirmOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("export.saveBtn")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t("export.saveConfirmBody")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSaveConfirmOpen(false); }}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={() => { void confirmSave(); }}>{t("common.confirm")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => { setImportOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("export.importBtn")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>{t("export.importFileHint")}</Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", gap: 1, px: 2, pb: 2 }}>
          <Button fullWidth variant="contained" onClick={triggerImportFile} sx={{ minHeight: 48 }}>{t("export.chooseFileBtn")}</Button>
          <Button fullWidth onClick={() => { setImportOpen(false); }}>{t("common.cancel")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importPasswordOpen} onClose={() => { setImportPasswordOpen(false); setImportFile(null); setShowImportPwd(false); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("export.encryptedImportTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("export.encryptedImportHint")}</Typography>
          <TextField
            fullWidth
            type={showImportPwd ? "text" : "password"}
            label={t("export.encryptPassword")}
            value={importPassword}
            onChange={(e) => { setImportPassword(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter" && importPassword.length > 0) handleImportPasswordConfirm(); }}
            autoFocus
            slotProps={{ input: { endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => { setShowImportPwd((v) => !v); }} onMouseDown={(e) => { e.preventDefault(); }} edge="end" size="small" aria-label={t("common.showPassword")}>
                  <SvgIcon fontSize="small" aria-hidden="true"><path d={showImportPwd ? EYE_OFF_PATH : EYE_PATH} /></SvgIcon>
                </IconButton>
              </InputAdornment>
            ) } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportPasswordOpen(false); setImportFile(null); }}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={importPassword.length === 0} onClick={handleImportPasswordConfirm}>
            {t("common.confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={warnOpen} onClose={() => { setWarnOpen(false); }}>
        <DialogTitle>{t("export.importWarningTitle")}</DialogTitle>
        <DialogContent><Typography>{t("export.importWarningBody")}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => { setWarnOpen(false); }}>{t("common.cancel")}</Button>
          <Button variant="outlined" color="warning" disabled={isImporting} onClick={() => { void confirmImport(); }}>{t("export.importConfirm")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
