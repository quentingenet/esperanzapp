import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { PageHeaderProps } from "@/types";

function BackIcon() {
  return (
    <SvgIcon aria-hidden="true">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </SvgIcon>
  );
}

export function PageHeader({ title, onBack }: PageHeaderProps) {
  const { t } = useTranslation();
  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ pt: "env(safe-area-inset-top)" }}>
      <Toolbar>
        {onBack && (
          <IconButton
            edge="start"
            onClick={onBack}
            aria-label={t("common.back")}
            sx={{ mr: 1, minWidth: 44, minHeight: 44 }}
          >
            <BackIcon />
          </IconButton>
        )}
        <Typography variant="h6" component="h1" sx={{ flex: 1, fontWeight: 700 }}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
