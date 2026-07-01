import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { weekDayLabel } from "./treatmentUtils";
import { useDateLocale } from "@/hooks";
import { TreatmentLogButton } from "./TreatmentLogButton";
import type { TreatmentCardProps } from "@/types";

const DELETE_PATH = "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";
const EDIT_PATH = "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z";
const CHEVRON_DOWN = "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z";
const CHEVRON_UP = "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z";

export function TreatmentCard({ treatment, todayLog, onLog, onDelete, onEdit, isExpanded, onToggle }: TreatmentCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const reminderText = () => {
    if (!treatment.reminderEnabled) return t("treatments.noReminder");
    if (treatment.frequency === "weekly" && treatment.reminderDay !== null) {
      return t("treatments.reminderWeekly", {
        day: weekDayLabel(treatment.reminderDay, dateLocale),
        time: treatment.reminderTime,
      });
    }
    if (treatment.frequency === "monthly" && treatment.reminderDay !== null) {
      const day = treatment.reminderDay === 0
        ? t("treatments.form.lastDay")
        : treatment.reminderDay === 1
          ? t("treatments.form.firstDay")
          : String(treatment.reminderDay);
      return t("treatments.reminderMonthly", { day, time: treatment.reminderTime });
    }
    return t("treatments.reminder", { time: treatment.reminderTime });
  };

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
            onClick={onEdit}
            aria-label={t("common.edit")}
            sx={{ color: "text.disabled", "&:hover": { color: "primary.main" } }}
          >
            <SvgIcon fontSize="small" aria-hidden="true"><path d={EDIT_PATH} /></SvgIcon>
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            aria-label={t("common.delete")}
            sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
          >
            <SvgIcon fontSize="small" aria-hidden="true"><path d={DELETE_PATH} /></SvgIcon>
          </IconButton>
          <IconButton
            size="small"
            onClick={onToggle}
            aria-label={isExpanded ? t("common.collapse") : t("common.expand")}
            aria-expanded={isExpanded}
            sx={{ color: "text.disabled", "&:hover": { color: "primary.main" } }}
          >
            <SvgIcon fontSize="small" aria-hidden="true">
              <path d={isExpanded ? CHEVRON_UP : CHEVRON_DOWN} />
            </SvgIcon>
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {reminderText()}
        </Typography>
        <TreatmentLogButton treatmentId={treatment.id} todayLog={todayLog} onLog={onLog} />
      </CardContent>
    </Card>
  );
}
