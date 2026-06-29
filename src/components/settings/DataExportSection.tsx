import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useExport } from "@/hooks";
import { toast } from "@/store/toastStore";

export function DataExportSection() {
  const { t } = useTranslation();
  const { exportJSON, exportCSV, importJSON, importCSV } = useExport();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"json" | "csv">("json");
  const [warnOpen, setWarnOpen] = useState(false);

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
    void (importType === "json" ? importJSON(importFile) : importCSV(importFile))
      .then(() => { toast.success(t("export.importSuccess")); })
      .catch(() => { toast.error(t("common.error")); });
    setWarnOpen(false);
    setImportFile(null);
  };

  const handleExport = (fn: () => Promise<boolean>) => {
    void fn()
      .then((shared) => { if (shared) toast.success(t("export.exportSuccess")); })
      .catch(() => { toast.error(t("common.error")); });
  };

  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t("export.title")}</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button variant="outlined" fullWidth onClick={() => { handleExport(exportJSON); }} sx={{ minHeight: 48 }}>{t("export.exportJSON")}</Button>
          <Button variant="outlined" fullWidth onClick={() => { handleExport(exportCSV); }} sx={{ minHeight: 48 }}>{t("export.exportCSV")}</Button>
          <Button variant="outlined" fullWidth onClick={() => { triggerImport("json"); }} sx={{ minHeight: 48 }}>{t("export.importJSON")}</Button>
          <Button variant="outlined" fullWidth onClick={() => { triggerImport("csv"); }} sx={{ minHeight: 48 }}>{t("export.importCSV")}</Button>
          <Alert severity="warning" sx={{ borderRadius: 2, mt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("export.privacyWarningTitle")}</Typography>
            <Typography variant="body2">{t("export.privacyWarningBody")}</Typography>
          </Alert>
        </Box>
      </Box>

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
