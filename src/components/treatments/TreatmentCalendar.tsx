import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { format, isAfter, isBefore, startOfDay, subYears } from "date-fns";
import { useTranslation } from "react-i18next";
import { useCalendar, useDateLocale } from "@/hooks";
import { toast } from "@/store/toastStore";
import { logError } from "@/utils/logger";
import { COLORS } from "@/theme/tokens";
import type { TreatmentCalendarProps, TreatmentStatus } from "@/types";
import { getPastOccurrences } from "./treatmentCalendarUtils";

const STATUS_CONFIG: Record<TreatmentStatus, { color: string; icon: string; bg: string; labelKey: string }> = {
  taken:   { color: "#5aaa7e",           icon: "✅", bg: "#e8f5ee", labelKey: "treatments.taken" },
  missed:  { color: COLORS.eventRelapse, icon: "❌", bg: "#fdf0f0", labelKey: "treatments.missed" },
  pending: { color: "#89afc4",           icon: "○",  bg: "#edf2f7", labelKey: "treatments.pending" },
};
const STATUS_ORDER: TreatmentStatus[] = ["taken", "missed", "pending"];


export function TreatmentCalendar({ treatmentId, frequency, reminderDay, createdAt, onLogDate }: TreatmentCalendarProps) {
  const { t } = useTranslation();
  const { getTreatmentStatusMap } = useCalendar();
  const dateLocale = useDateLocale();
  const [statusMap, setStatusMap] = useState<Record<string, TreatmentStatus>>({});
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refreshSeq = useRef(0);
  const refreshMap = useCallback(() => {
    const seq = ++refreshSeq.current;
    void getTreatmentStatusMap(treatmentId)
      .then((map) => { if (mountedRef.current && seq === refreshSeq.current) setStatusMap(map); })
      .catch((e: unknown) => { logError("TreatmentCalendar.refreshMap", e); toast.error(t("common.error")); });
  }, [treatmentId, getTreatmentStatusMap, t]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getTreatmentStatusMap(treatmentId).then((map) => {
      if (!guard.cancelled) setStatusMap(map);
    }).catch((e: unknown) => { logError("TreatmentCalendar.loadMap", e); });
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
    try {
      await onLogDate(dateStr, status);
      refreshMap();
    } catch {
      toast.error(t("common.error"));
    }
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
    const cfg = status !== undefined ? STATUS_CONFIG[status] : undefined;
    const dayLabel = format(props.day, "PP", { locale: dateLocale });
    const ariaLabel = status !== undefined ? `${dayLabel}, ${t(`treatments.${status}`)}` : dayLabel;
    return (
      <Box sx={{ position: "relative", borderRadius: "50%", bgcolor: cfg?.bg ?? "transparent" }}>
        <PickerDay {...props} aria-label={ariaLabel} />
        {cfg !== undefined && (
          <Box aria-hidden="true" sx={{ position: "absolute", bottom: 1, right: 1, fontSize: "9px", lineHeight: 1 }}>
            {cfg.icon}
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
          {STATUS_ORDER.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <Button
                key={status}
                fullWidth
                variant="outlined"
                onClick={() => { void handleStatus(status); }}
                sx={{
                  minHeight: 48,
                  justifyContent: "flex-start",
                  gap: 1.5,
                  borderColor: cfg.color,
                  color: cfg.color,
                  "&:hover": { bgcolor: cfg.bg },
                }}
              >
                <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>{cfg.icon}</span>
                {t(`treatments.${status}`)}
              </Button>
            );
          })}
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
            const cfg = status !== undefined ? STATUS_CONFIG[status] : undefined;
            const formattedDate = format(date, "P", { locale: dateLocale });
            const statusLabel = status !== undefined ? t(`treatments.${status}`) : t("treatments.pending");
            return (
              <ButtonBase
                key={dateStr}
                component="div"
                onClick={() => { handleDaySelect(date); }}
                disabled={!onLogDate}
                aria-label={`${formattedDate}, ${statusLabel}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  px: 2,
                  py: 1.25,
                  mb: 0.5,
                  borderRadius: 2,
                  bgcolor: cfg?.bg ?? "action.hover",
                  "&:hover": onLogDate ? { opacity: 0.75 } : {},
                }}
              >
                <Typography variant="body2">{formattedDate}</Typography>
                {cfg !== undefined && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cfg.color }} />
                    <Typography aria-hidden="true" variant="caption" sx={{ color: cfg.color }}>{cfg.icon}</Typography>
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
          {STATUS_ORDER.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: cfg.color }} />
                <Typography variant="caption" color="text.secondary"><span aria-hidden="true">{cfg.icon}</span>{" "}{t(cfg.labelKey)}</Typography>
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
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: cfg.color }} />
              <Typography variant="caption" color="text.secondary">{cfg.icon} {t(cfg.labelKey)}</Typography>
            </Box>
          );
        })}
      </Box>

      {statusDialog}
    </Box>
  );
}
