import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { HabitDropdown } from "./HabitDropdown";
import { useDateLocale } from "@/hooks";
import type { HabitFormProps, HabitTypeId } from "@/types";
import { getHabitTypeConfig } from "@/utils/habitTypes";

const ADD_PATH = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z";

export function HabitForm({ onSubmit, existingHabits }: HabitFormProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<HabitTypeId | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [today, setToday] = useState<Date>(() => startOfDay(new Date()));
  const [startDate, setStartDate] = useState<Date | null>(() => startOfDay(new Date()));

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = tomorrow.getTime() - now.getTime() + 500;
    const timer = setTimeout(() => {
      const newToday = startOfDay(new Date());
      setStartDate((d) => (d && startOfDay(d).getTime() === today.getTime() ? newToday : d));
      setToday(newToday);
    }, ms);
    return () => clearTimeout(timer);
  }, [today]);

  const config = selectedId != null ? getHabitTypeConfig(selectedId) : undefined;

  const isDuplicate =
    selectedId !== null &&
    selectedId !== "custom" &&
    config != null &&
    existingHabits.some((h) => h.icon === config.svgPath);

  const handleSubmit = () => {
    if (!config || !startDate || selectedId === null || isDuplicate) return;
    const label =
      selectedId === "custom" ? customLabel.trim() : t(`habitTypes.${selectedId}.label`);
    if (!label) return;
    onSubmit({
      label,
      icon: config.svgPath,
      color: config.color,
      bgColor: config.bgColor,
      startDate: format(startDate, "yyyy-MM-dd"),
    });
    setSelectedId(null);
    setCustomLabel("");
    setStartDate(today);
    setOpen(false);
  };

  const canSubmit =
    config != null &&
    startDate != null &&
    !isDuplicate &&
    (selectedId !== "custom" || customLabel.trim().length > 0);

  return (
    <>
      <Fab
        color="primary"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={t("habits.add")}
        sx={{
          position: "fixed",
          bottom: "calc(80px + max(env(safe-area-inset-bottom), 28px))",
          right: 16,
          width: 56,
          height: 56,
        }}
      >
        <SvgIcon aria-hidden="true">
          <path d={ADD_PATH} />
        </SvgIcon>
      </Fab>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        slotProps={{ paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "90dvh" } } }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
          <Box sx={{ px: 2, pt: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {t("habits.add")}
            </Typography>
            <Box sx={{ overflowY: "auto", maxHeight: "55dvh" }}>
              <HabitDropdown
                selectedId={selectedId}
                customLabel={customLabel}
                onSelect={setSelectedId}
                onCustomChange={setCustomLabel}
              />
            </Box>
            {isDuplicate && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t("habits.duplicateWarning")}
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                label={t("habits.form.startDate")}
                maxDate={today}
                slotProps={{
                  textField: { fullWidth: true, "aria-label": t("habits.form.startDate") },
                }}
              />
            </Box>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label={t("common.save")}
              sx={{ mt: 2, mb: 1, minHeight: 48, borderRadius: 2 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </LocalizationProvider>
      </Drawer>
    </>
  );
}
