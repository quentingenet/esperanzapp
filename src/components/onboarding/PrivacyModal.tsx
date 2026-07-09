import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { PrivacyModalProps } from "@/types";
import { KofiButton } from "@/components/settings/KofiButton";

const GITHUB_URL = "https://github.com/quentingenet/esperanzapp";

const POINTS = [
  "noAccount",
  "noServer",
  "localEncryption",
  "encryptedExport",
  "noTracking",
  "openSource",
] as const;

export function PrivacyModal({ open, onAccept, readOnly = false }: PrivacyModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: { height: "80dvh", maxHeight: "80dvh", display: "flex", flexDirection: "column" },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.3rem", pb: 0, flexShrink: 0 }}>
        {t("privacy.title")}
      </DialogTitle>
      <DialogContent sx={{ overflowY: "auto", flex: 1 }}>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          {t("privacy.subtitle")}
        </Typography>
        <List dense disablePadding>
          {POINTS.map((key) => (
            <ListItem key={key} disableGutters sx={{ py: 0.5 }}>
              <ListItemText primary={`✓ ${t(`privacy.points.${key}`)}`} />
            </ListItem>
          ))}
        </List>
        <KofiButton sx={{ my: 3, width: "100%" }} />
        <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            color="inherit"
          >
            {t("settings.sourceCode")}
          </Link>
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
          {t("privacy.license")}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
          {t("app.by")} Quentin Genet
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          fullWidth
          variant={readOnly ? "outlined" : "contained"}
          onClick={onAccept}
          aria-label={readOnly ? t("common.close") : t("privacy.accept")}
          sx={{ minHeight: 48, borderRadius: 2, fontSize: "1rem" }}
        >
          {readOnly ? t("common.close") : t("privacy.accept")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
