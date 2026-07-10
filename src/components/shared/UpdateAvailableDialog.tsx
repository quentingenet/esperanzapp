import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useAppUpdate } from "@/hooks";

export function UpdateAvailableDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { openUpdate } = useAppUpdate();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("update.available")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {t("update.availableBody")}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={onClose}>{t("update.later")}</Button>
        <Button
          variant="contained"
          onClick={() => {
            onClose();
            void openUpdate();
          }}
        >
          {t("update.updateNow")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
