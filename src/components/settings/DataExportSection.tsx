import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useExport, useHabits, useNotifications, useTreatments } from "@/hooks";
import { useTreatmentsStore } from "@/store/treatmentsStore";
import { WrongPasswordError } from "@/services/exportService";
import { toast } from "@/store/toastStore";

const MIN_PASSWORD_LENGTH = 8;

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

  // Export encryption state
  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");

  // Import encryption state
  const [importPasswordOpen, setImportPasswordOpen] = useState(false);
  const [importPassword, setImportPassword] = useState("");

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
      .catch(() => { toast.error(t("export.filesystemError")); });
    setExportOpen(false);
    resetExportEncryptState();
  };

  const handleSaveClick = () => {
    setExportOpen(false);
    setSaveConfirmOpen(true);
  };

  const confirmSave = async () => {
    const outcome = await (useCSVExport ? saveCSV(resolvedExportPassword) : saveJSON(resolvedExportPassword));
    setSaveConfirmOpen(false);
    resetExportEncryptState();
    if (outcome === "ok") toast.success(t("export.saveSuccess"));
    else if (outcome === "documents-unavailable") toast.error(t("export.documentsUnavailable"));
    else toast.error(t("export.filesystemError"));
  };

  const resetExportEncryptState = () => {
    setEncryptExport(false);
    setExportPassword("");
    setExportPasswordConfirm("");
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
      });
    };
    input.click();
  };

  const handleImportPasswordConfirm = () => {
    setImportPasswordOpen(false);
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
      await Promise.all([loadHabits(), loadTreatments()]);
      toast.success(t("export.importSuccess"));
      // Notification rescheduling is best-effort: never block the success path
      try {
        const freshTreatments = useTreatmentsStore.getState().treatments;
        const hasTreatmentsWithReminder = freshTreatments.some((tr) => tr.reminderEnabled);
        if (hasTreatmentsWithReminder) {
          const granted = await requestPermission();
          if (!granted) {
            toast.info(t("export.importReschedulePermissionDenied"));
          }
          await rescheduleAll(freshTreatments);
        }
      } catch { /* non-critical */ }
    } catch (e) {
      if (e instanceof WrongPasswordError) {
        toast.error(t("export.encryptedImportError"));
      } else {
        toast.error(t("common.error"));
      }
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

      {/* Export dialog */}
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
                type="password"
                label={t("export.encryptPassword")}
                value={exportPassword}
                onChange={(e) => { setExportPassword(e.target.value); }}
                error={passwordTooShort}
                helperText={passwordTooShort ? t("export.encryptPasswordMinLength") : undefined}
                size="small"
              />
              <TextField
                fullWidth
                type="password"
                label={t("export.encryptPasswordConfirm")}
                value={exportPasswordConfirm}
                onChange={(e) => { setExportPasswordConfirm(e.target.value); }}
                error={passwordMismatch}
                helperText={passwordMismatch ? t("export.encryptPasswordMismatch") : undefined}
                size="small"
              />
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">{t("export.encryptWarning")}</Typography>
              </Alert>
            </Box>
          )}

          <Alert severity="warning" sx={{ borderRadius: 2, mt: encryptExport ? 0 : 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("export.privacyWarningTitle")}</Typography>
            <Typography variant="body2">{t("export.privacyWarningBody")}</Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", gap: 1, px: 2, pb: 2 }}>
          <Button fullWidth variant="contained" onClick={handleShare} disabled={exportDisabled} sx={{ minHeight: 48 }}>{t("export.shareBtn")}</Button>
          <Button fullWidth variant="outlined" onClick={handleSaveClick} disabled={exportDisabled} sx={{ minHeight: 48 }}>{t("export.saveBtn")}</Button>
          <Button fullWidth onClick={() => { setExportOpen(false); resetExportEncryptState(); }}>{t("common.cancel")}</Button>
        </DialogActions>
      </Dialog>

      {/* Save confirm dialog */}
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

      {/* Import: choose file dialog */}
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

      {/* Import: password dialog (encrypted files only) */}
      <Dialog open={importPasswordOpen} onClose={() => { setImportPasswordOpen(false); setImportFile(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("export.encryptedImportTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("export.encryptedImportHint")}</Typography>
          <TextField
            fullWidth
            type="password"
            label={t("export.encryptPassword")}
            value={importPassword}
            onChange={(e) => { setImportPassword(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter" && importPassword.length > 0) handleImportPasswordConfirm(); }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportPasswordOpen(false); setImportFile(null); }}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={importPassword.length === 0} onClick={handleImportPasswordConfirm}>
            {t("common.confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import: data overwrite warning dialog */}
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
