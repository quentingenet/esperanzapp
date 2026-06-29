import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      {body && (
        <DialogContent>
          <Typography color="text.secondary">{body}</Typography>
        </DialogContent>
      )}
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button fullWidth variant="outlined" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button fullWidth variant="contained" color="error" onClick={onConfirm}>
          {confirmLabel ?? t("common.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
