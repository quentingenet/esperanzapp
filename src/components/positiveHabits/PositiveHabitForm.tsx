import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PositiveHabitDropdown } from "./PositiveHabitDropdown";
import { useDateLocale, useNotifications } from "@/hooks";
import { toast } from "@/store/toastStore";
import { ReminderFields } from "@/components/shared";
import { getPositiveHabitTypeConfig } from "@/utils/positiveHabitTypes";
import type { Frequency, PositiveHabitFormProps, PositiveHabitTypeId } from "@/types";
import { FAB_SX, FAB_PULSE_SX } from "@/utils/fabAnimation";

const ADD_PATH = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z";
const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly"];

export function PositiveHabitForm({
  onSubmit,
  existingPositiveHabits,
  isEmpty = false,
}: PositiveHabitFormProps) {
  const { t } = useTranslation();
  const { requestPermission } = useNotifications();
  const dateLocale = useDateLocale();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<PositiveHabitTypeId | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDay, setReminderDay] = useState<number | null>(null);
  const [time, setTime] = useState<Date | null>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const config = selectedId != null ? getPositiveHabitTypeConfig(selectedId) : undefined;

  const isDuplicate =
    selectedId !== null &&
    selectedId !== "custom" &&
    config != null &&
    existingPositiveHabits.some((h) => h.icon === config.svgPath);

  const handleFrequencyChange = (value: string) => {
    const f = value as Frequency;
    setFrequency(f);
    if (f === "weekly") setReminderDay(1);
    else if (f === "monthly") setReminderDay(1);
    else setReminderDay(null);
  };

  const resetForm = () => {
    setSelectedId(null);
    setCustomLabel("");
    setFrequency("daily");
    setReminderEnabled(true);
    setReminderDay(null);
    setTime(new Date());
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (isSaving || !config || selectedId === null || isDuplicate) return;
    const label =
      selectedId === "custom" ? customLabel.trim() : t(`positiveHabitTypes.${selectedId}.label`);
    if (!label) return;
    setIsSaving(true);
    try {
      let effectiveReminderEnabled = reminderEnabled;
      if (reminderEnabled) {
        if (!time) return;
        if (frequency !== "daily" && reminderDay === null) return;
        if (Capacitor.isNativePlatform()) {
          const { display } = await LocalNotifications.checkPermissions().catch(() => ({
            display: "denied" as const,
          }));
          if (display === "prompt") {
            const granted = await requestPermission();
            if (!granted) {
              effectiveReminderEnabled = false;
              toast.info(t("treatments.form.permissionDenied"));
            }
          } else if (display === "denied") {
            effectiveReminderEnabled = false;
            toast.info(t("treatments.form.permissionDenied"));
          }
        }
      }
      onSubmit({
        label,
        icon: config.svgPath,
        color: config.color,
        bgColor: config.bgColor,
        frequency,
        reminderEnabled: effectiveReminderEnabled,
        reminderDay: frequency === "daily" ? null : reminderDay,
        reminderTime: time ? format(time, "HH:mm") : "08:00",
        isCustom: selectedId === "custom",
      });
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit =
    config != null &&
    !isDuplicate &&
    (selectedId !== "custom" || customLabel.trim().length > 0) &&
    !isSaving &&
    (!reminderEnabled || (time !== null && (frequency === "daily" || reminderDay !== null)));

  return (
    <>
      <Fab
        color="primary"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={t("positiveHabits.add")}
        sx={{
          position: "fixed",
          bottom: "calc(80px + max(env(safe-area-inset-bottom), 28px))",
          right: 16,
          width: 56,
          height: 56,
          ...(isEmpty ? FAB_PULSE_SX : FAB_SX),
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
          <Box sx={{ px: 2, pt: 2, pb: "calc(24px + env(safe-area-inset-bottom))" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {t("positiveHabits.add")}
            </Typography>
            <Box sx={{ overflowY: "auto", maxHeight: "40dvh" }}>
              <PositiveHabitDropdown
                selectedId={selectedId}
                customLabel={customLabel}
                onSelect={setSelectedId}
                onCustomChange={setCustomLabel}
              />
            </Box>
            {isDuplicate && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t("positiveHabits.duplicateWarning")}
              </Alert>
            )}
            <Select
              fullWidth
              value={frequency}
              onChange={(e) => {
                handleFrequencyChange(e.target.value);
              }}
              sx={{ mt: 2, mb: 2 }}
            >
              {FREQUENCIES.map((f) => (
                <MenuItem key={f} value={f}>
                  {t(`treatments.form.frequencies.${f}`)}
                </MenuItem>
              ))}
            </Select>
            <ReminderFields
              frequency={frequency}
              reminderEnabled={reminderEnabled}
              onReminderEnabledChange={setReminderEnabled}
              time={time}
              onTimeChange={setTime}
              reminderDay={reminderDay}
              onReminderDayChange={setReminderDay}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={!canSubmit}
              aria-label={t("common.save")}
              sx={{ mt: 1, minHeight: 48, borderRadius: 2 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </LocalizationProvider>
      </Drawer>
    </>
  );
}
