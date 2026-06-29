import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { PickerDay } from "@mui/x-date-pickers/PickerDay";
import type { PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { format, isAfter, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { useCalendar, useDateLocale } from "@/hooks";
import { COLORS } from "@/theme/tokens";
import type { TreatmentCalendarProps, TreatmentStatus } from "@/types";

const STATUS_COLORS: Partial<Record<TreatmentStatus, string>> = {
  taken: "#5aaa7e", missed: COLORS.eventRelapse, pending: "#89afc4",
};
const STATUS_ICONS: Partial<Record<TreatmentStatus, string>> = {
  taken: "✅", missed: "❌", pending: "○",
};
const STATUS_BG: Partial<Record<TreatmentStatus, string>> = {
  taken: "#e8f5ee", missed: "#fdf0f0", pending: "#edf2f7",
};
const LEGEND: { status: TreatmentStatus; labelKey: string }[] = [
  { status: "taken",   labelKey: "treatments.taken" },
  { status: "missed",  labelKey: "treatments.missed" },
  { status: "pending", labelKey: "treatments.pending" },
];
const STATUS_ORDER: TreatmentStatus[] = ["taken", "missed", "pending"];

export function TreatmentCalendar({ treatmentId, onLogDate }: TreatmentCalendarProps) {
  const { t } = useTranslation();
  const { getTreatmentStatusMap } = useCalendar();
  const dateLocale = useDateLocale();
  const [statusMap, setStatusMap] = useState<Record<string, TreatmentStatus>>({});
  const [dialogDate, setDialogDate] = useState<Date | null>(null);

  const refreshMap = useCallback(() => {
    void getTreatmentStatusMap(treatmentId).then(setStatusMap);
  }, [treatmentId, getTreatmentStatusMap]);

  useEffect(() => { refreshMap(); }, [refreshMap]);

  const handleDaySelect = (date: Date | null) => {
    if (!date || !onLogDate) return;
    if (isAfter(startOfDay(date), startOfDay(new Date()))) return;
    setDialogDate(date);
  };

  const handleStatus = async (status: TreatmentStatus) => {
    if (!dialogDate || !onLogDate) return;
    const dateStr = format(dialogDate, "yyyy-MM-dd");
    setDialogDate(null);
    await onLogDate(dateStr, status);
    refreshMap();
  };

  const CustomDay = useCallback((props: PickerDayProps) => {
    const dateStr = format(props.day, "yyyy-MM-dd");
    const status = statusMap[dateStr];
    const color = STATUS_COLORS[status];
    const icon = STATUS_ICONS[status];
    const bg = STATUS_BG[status];
    return (
      <Box sx={{ position: "relative", borderRadius: "50%", bgcolor: bg ?? "transparent" }}>
        <PickerDay {...props} />
        {icon !== undefined && color !== undefined && (
          <Box sx={{ position: "absolute", bottom: 1, right: 1, fontSize: "9px", lineHeight: 1 }}>
            {icon}
          </Box>
        )}
      </Box>
    );
  }, [statusMap]);

  return (
    <Box>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
        <DateCalendar
          disableFuture
          onChange={handleDaySelect}
          slots={{ day: CustomDay as React.ComponentType<PickerDayProps> }}
          sx={{ width: "100%" }}
        />
      </LocalizationProvider>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap", mt: 0.5 }}>
        {LEGEND.map(({ status, labelKey }) => {
          const color = STATUS_COLORS[status];
          const icon = STATUS_ICONS[status];
          return (
            <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
              <Typography variant="caption" color="text.secondary">{icon} {t(labelKey)}</Typography>
            </Box>
          );
        })}
      </Box>

      <Dialog open={dialogDate !== null} onClose={() => { setDialogDate(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {dialogDate ? format(dialogDate, "PP", { locale: dateLocale }) : ""}
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {STATUS_ORDER.map((status) => (
              <Button
                key={status}
                fullWidth
                variant="outlined"
                onClick={() => { void handleStatus(status); }}
                sx={{
                  minHeight: 48,
                  justifyContent: "flex-start",
                  gap: 1.5,
                  borderColor: STATUS_COLORS[status],
                  color: STATUS_COLORS[status],
                  "&:hover": { bgcolor: STATUS_BG[status] },
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{STATUS_ICONS[status]}</span>
                {t(`treatments.${status}`)}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogDate(null); }}>{t("common.cancel")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
