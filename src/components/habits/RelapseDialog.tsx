import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks";
import type { RelapseDialogProps } from "@/types";

function getMessageKey(days: number): string {
  if (days === 0) return "relapse.messages.day0";
  if (days < 7) return "relapse.messages.before7days";
  if (days <= 30) return "relapse.messages.between7and30days";
  return "relapse.messages.after30days";
}

export function RelapseDialog({
  open,
  habit,
  stats,
  userName,
  onConfirm,
  onCancel,
}: RelapseDialogProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [today, setToday] = useState<Date>(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const messageKey = getMessageKey(stats.currentStreak);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = tomorrow.getTime() - now.getTime() + 500;
    const timer = setTimeout(() => {
      const newToday = startOfDay(new Date());
      setSelectedDate((d) => (startOfDay(d).getTime() === today.getTime() ? newToday : d));
      setToday(newToday);
    }, ms);
    return () => clearTimeout(timer);
  }, [today]);
  const habitStart = startOfDay(parse(habit.startDate, "yyyy-MM-dd", new Date()));
  const rawMessage = t(messageKey, { name: userName, days: stats.currentStreak });
  const displayMessage = userName.trim()
    ? rawMessage
    : rawMessage.replace(/^,\s*/, "").replace(/^(.)/, (c) => c.toUpperCase());

  const handleConfirm = () => {
    onConfirm(format(selectedDate, "yyyy-MM-dd"));
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(4px)" } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{t("relapse.confirmTitle")}</DialogTitle>
      <DialogContent sx={{ pb: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("relapse.confirmBody")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          {t("relapse.dateLabel")}
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
          <DateCalendar
            value={selectedDate}
            onChange={(d) => {
              if (d) setSelectedDate(startOfDay(d));
            }}
            maxDate={today}
            shouldDisableDate={(day) => {
              const d = startOfDay(day);
              return d > today || d < habitStart;
            }}
            sx={{ width: "100%", mx: "auto" }}
          />
        </LocalizationProvider>
        <Typography variant="body2" sx={{ fontStyle: "italic", mt: 0.5 }}>
          {displayMessage}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", gap: 1, px: 3, pb: 3, pt: 2 }}>
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
          onClick={handleConfirm}
          aria-label={t("relapse.confirmButton")}
          sx={{ minHeight: 44 }}
        >
          {t("relapse.confirmButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
