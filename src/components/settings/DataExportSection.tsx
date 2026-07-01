import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useExport } from "@/hooks";
import { toast } from "@/store/toastStore";

export function DataExportSection() {
  const { t } = useTranslation();
  const { exportJSON, exportCSV, saveJSON, saveCSV, importJSON, importCSV } = useExport();

  const [exportOpen, setExportOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [useCSVExport, setUseCSVExport] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"json" | "csv">("json");
  const [warnOpen, setWarnOpen] = useState(false);

  const handleShare = () => {
    void (useCSVExport ? exportCSV() : exportJSON());
    setExportOpen(false);
  };

  const handleSaveClick = () => {
    setExportOpen(false);
    setSaveConfirmOpen(true);
  };

  const confirmSave = async () => {
    const ok = await (useCSVExport ? saveCSV() : saveJSON());
    setSaveConfirmOpen(false);
    if (ok) toast.success(t("export.saveSuccess"));
    else toast.error(t("export.error"));
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
      setWarnOpen(true);
    };
    input.click();
  };

  const confirmImport = () => {
    if (!importFile) return;
    void (importType === "json" ? importJSON(importFile) : importCSV(importFile))
      .then(() => { toast.success(t("export.importSuccess")); })
      .catch(() => { toast.error(t("common.error")); });
    setWarnOpen(false);
    setImportFile(null);
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 3, justifyContent: "center", pt: 6, px: 2 }}>
        <Button variant="outlined" onClick={() => { setExportOpen(true); }} sx={{ minHeight: 52, minWidth: 130 }}>
          {t("export.exportBtn")}
        </Button>
        <Button variant="outlined" onClick={() => { setImportOpen(true); }} sx={{ minHeight: 52, minWidth: 130 }}>
          {t("export.importBtn")}
        </Button>
      </Box>

      <Dialog open={exportOpen} onClose={() => { setExportOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("export.exportBtn")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: useCSVExport ? 400 : 700, color: useCSVExport ? "text.secondary" : "primary.main" }}>JSON</Typography>
            <Switch checked={useCSVExport} onChange={(e) => { setUseCSVExport(e.target.checked); }} />
            <Typography variant="body2" sx={{ fontWeight: useCSVExport ? 700 : 400, color: useCSVExport ? "primary.main" : "text.secondary" }}>CSV</Typography>
          </Box>
          <Alert severity="warning" sx={{ borderRadius: 2, mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("export.privacyWarningTitle")}</Typography>
            <Typography variant="body2">{t("export.privacyWarningBody")}</Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", gap: 1, px: 2, pb: 2 }}>
          <Button fullWidth variant="contained" onClick={handleShare} sx={{ minHeight: 48 }}>{t("export.shareBtn")}</Button>
          <Button fullWidth variant="outlined" onClick={handleSaveClick} sx={{ minHeight: 48 }}>{t("export.saveBtn")}</Button>
          <Button fullWidth onClick={() => { setExportOpen(false); }}>{t("common.cancel")}</Button>
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

      <Dialog open={warnOpen} onClose={() => { setWarnOpen(false); }}>
        <DialogTitle>{t("export.importWarningTitle")}</DialogTitle>
        <DialogContent><Typography>{t("export.importWarningBody")}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => { setWarnOpen(false); }}>{t("common.cancel")}</Button>
          <Button variant="outlined" color="warning" onClick={confirmImport}>{t("export.importConfirm")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
