import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { TreatmentLogButton } from "./TreatmentLogButton";
import type { TreatmentCardProps } from "@/types";

const DELETE_PATH = "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";
const EDIT_PATH = "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z";

export function TreatmentCard({ treatment, todayLog, onLog, onDelete, onEdit }: TreatmentCardProps) {
  const { t } = useTranslation();
  return (
    <Card elevation={0} sx={{ borderRadius: "16px", mb: 1.5 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            {treatment.label}
          </Typography>
          <Chip label={t(`treatments.form.frequencies.${treatment.frequency}`)} size="small" sx={{ fontSize: "11px" }} />
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label={t("common.edit")}
            sx={{ color: "text.disabled", "&:hover": { color: "primary.main" } }}
          >
            <SvgIcon fontSize="small" aria-hidden="true"><path d={EDIT_PATH} /></SvgIcon>
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label={t("common.delete")}
            sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
          >
            <SvgIcon fontSize="small" aria-hidden="true"><path d={DELETE_PATH} /></SvgIcon>
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {treatment.reminderEnabled
            ? t("treatments.reminder", { time: treatment.reminderTime })
            : t("treatments.noReminder")}
        </Typography>
        <TreatmentLogButton treatmentId={treatment.id} todayLog={todayLog} onLog={onLog} />
      </CardContent>
    </Card>
  );
}
