import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
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
import { format, isAfter, isBefore, parseISO, startOfDay, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { useTranslation } from "react-i18next";
import { useCalendar, useDateLocale } from "@/hooks";
import { COLORS } from "@/theme/tokens";
import type { Frequency, TreatmentCalendarProps, TreatmentStatus } from "@/types";

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

function getPastOccurrences(frequency: Frequency, reminderDay: number | null, createdAt: string): Date[] {
  const today = startOfDay(new Date());
  const created = startOfDay(parseISO(createdAt.slice(0, 10)));
  const result: Date[] = [];

  if (frequency === "weekly" && reminderDay !== null) {
    let current = today;
    let safety = 0;
    while (current.getDay() !== reminderDay && safety < 7) {
      current = subDays(current, 1);
      safety++;
    }
    while (!isBefore(current, created)) {
      result.push(current);
      current = subWeeks(current, 1);
    }
  } else if (frequency === "monthly") {
    const day = reminderDay ?? 1;
    let monthOffset = 0;
    while (monthOffset < 600) {
      const monthBase = subMonths(today, monthOffset);
      let occurrence: Date;
      if (day === 0) {
        occurrence = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0);
      } else {
        const daysInMonth = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0).getDate();
        occurrence = new Date(monthBase.getFullYear(), monthBase.getMonth(), Math.min(day, daysInMonth));
      }
      if (isBefore(startOfDay(occurrence), created)) break;
      if (!isAfter(startOfDay(occurrence), today)) result.push(occurrence);
      monthOffset++;
    }
  }

  return result;
}

export function TreatmentCalendar({ treatmentId, frequency, reminderDay, createdAt, onLogDate }: TreatmentCalendarProps) {
  const { t } = useTranslation();
  const { getTreatmentStatusMap } = useCalendar();
  const dateLocale = useDateLocale();
  const [statusMap, setStatusMap] = useState<Record<string, TreatmentStatus>>({});
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);

  const refreshMap = useCallback(() => {
    void getTreatmentStatusMap(treatmentId).then(setStatusMap);
  }, [treatmentId, getTreatmentStatusMap]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getTreatmentStatusMap(treatmentId).then((map) => {
      if (!guard.cancelled) setStatusMap(map);
    });
    return () => { guard.cancelled = true; };
  }, [treatmentId, getTreatmentStatusMap]);

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

  const occurrences = useMemo(() => {
    if (frequency === "daily") return [];
    return getPastOccurrences(frequency, reminderDay, createdAt);
  }, [frequency, reminderDay, createdAt]);

  const WINDOW_YEARS = 1;
  const visibleOccurrences = useMemo(() => {
    if (showAllOccurrences) return occurrences;
    const cutoff = subYears(startOfDay(new Date()), WINDOW_YEARS);
    return occurrences.filter((d) => !isBefore(d, cutoff));
  }, [occurrences, showAllOccurrences]);

  const CustomDay = useCallback((props: PickerDayProps) => {
    const dateStr = format(props.day, "yyyy-MM-dd");
    const status = statusMap[dateStr];
    const color = STATUS_COLORS[status];
    const icon = STATUS_ICONS[status];
    const bg = STATUS_BG[status];
    const hasStatus = STATUS_COLORS[status] !== undefined;
    const statusLabel = hasStatus ? t(`treatments.${status}`) : undefined;
    const dayLabel = format(props.day, "PP", { locale: dateLocale });
    const ariaLabel = statusLabel !== undefined ? `${dayLabel} — ${statusLabel}` : dayLabel;
    return (
      <Box sx={{ position: "relative", borderRadius: "50%", bgcolor: bg ?? "transparent" }}>
        <PickerDay {...props} aria-label={ariaLabel} />
        {icon !== undefined && color !== undefined && (
          <Box aria-hidden="true" sx={{ position: "absolute", bottom: 1, right: 1, fontSize: "9px", lineHeight: 1 }}>
            {icon}
          </Box>
        )}
      </Box>
    );
  }, [statusMap, t, dateLocale]);

  const statusDialog = (
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
              <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>{STATUS_ICONS[status]}</span>
              {t(`treatments.${status}`)}
            </Button>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setDialogDate(null); }}>{t("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );

  if (frequency !== "daily") {
    const hiddenCount = occurrences.length - visibleOccurrences.length;
    return (
      <Box>
        <Box sx={{ maxHeight: 320, overflow: "auto", px: 1, pt: 1 }}>
          {visibleOccurrences.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const status = statusMap[dateStr];
            const color = STATUS_COLORS[status];
            const icon = STATUS_ICONS[status];
            const bg = STATUS_BG[status];
            const formattedDate = format(date, "P", { locale: dateLocale });
            const hasStatus = STATUS_COLORS[status] !== undefined;
            const statusLabel = hasStatus ? t(`treatments.${status}`) : t("treatments.pending");
            return (
              <ButtonBase
                key={dateStr}
                component="div"
                onClick={() => { handleDaySelect(date); }}
                disabled={!onLogDate}
                aria-label={`${formattedDate} — ${statusLabel}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  px: 2,
                  py: 1.25,
                  mb: 0.5,
                  borderRadius: 2,
                  bgcolor: bg ?? "action.hover",
                  "&:hover": onLogDate ? { opacity: 0.75 } : {},
                }}
              >
                <Typography variant="body2">{formattedDate}</Typography>
                {color !== undefined && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                    <Typography aria-hidden="true" variant="caption" sx={{ color }}>{icon}</Typography>
                  </Box>
                )}
              </ButtonBase>
            );
          })}
        </Box>
        {hiddenCount > 0 && (
          <Collapse in={!showAllOccurrences}>
            <Box sx={{ textAlign: "center", pt: 0.5 }}>
              <Button size="small" onClick={() => { setShowAllOccurrences(true); }}>
                {"+ "}{hiddenCount}
              </Button>
            </Box>
          </Collapse>
        )}
        {showAllOccurrences && hiddenCount > 0 && (
          <Box sx={{ textAlign: "center", pt: 0.5 }}>
            <Button size="small" onClick={() => { setShowAllOccurrences(false); }}>
              {t("common.collapse")}
            </Button>
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap", mt: 1, mb: 0.5 }}>
          {LEGEND.map(({ status, labelKey }) => {
            const color = STATUS_COLORS[status];
            const icon = STATUS_ICONS[status];
            return (
              <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                <Typography variant="caption" color="text.secondary"><span aria-hidden="true">{icon}</span>{" "}{t(labelKey)}</Typography>
              </Box>
            );
          })}
        </Box>
        {statusDialog}
      </Box>
    );
  }

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

      {statusDialog}
    </Box>
  );
}
