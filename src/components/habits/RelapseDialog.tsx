import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { RelapseDialogProps } from "@/types";

function getMessageKey(days: number): string {
  if (days === 0) return "relapse.messages.day0";
  if (days < 7) return "relapse.messages.before7days";
  if (days <= 30) return "relapse.messages.between7and30days";
  return "relapse.messages.after30days";
}

export function RelapseDialog({
  open,
  stats,
  userName,
  onConfirm,
  onCancel,
}: RelapseDialogProps) {
  const { t } = useTranslation();
  const messageKey = getMessageKey(stats.currentStreak);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(4px)" } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t("relapse.confirmTitle")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("relapse.confirmBody")}
        </Typography>
        <Typography variant="body2" sx={{ fontStyle: "italic" }}>
          {t(messageKey, { name: userName, days: stats.currentStreak })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", gap: 1, px: 3, pb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          autoFocus
          onClick={onCancel}
          aria-label={t("relapse.cancelButton")}
          sx={{ minHeight: 48, borderRadius: 2 }}
        >
          {t("relapse.cancelButton")}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="warning"
          onClick={onConfirm}
          aria-label={t("relapse.confirmButton")}
          sx={{ minHeight: 44 }}
        >
          {t("relapse.confirmButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
