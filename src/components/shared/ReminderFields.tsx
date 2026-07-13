import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { useTranslation } from "react-i18next";
import { ReminderDaySelect } from "./ReminderDaySelect";
import type { Frequency } from "@/types";

interface ReminderFieldsProps {
  frequency: Frequency;
  reminderEnabled: boolean;
  onReminderEnabledChange: (enabled: boolean) => void;
  time: Date | null;
  onTimeChange: (time: Date | null) => void;
  reminderDay: number | null;
  onReminderDayChange: (day: number) => void;
}

// Shared by Treatments and PositiveHabits: the "enable reminder / time / day" block is
// identical logic and copy (i18n keys under treatments.form.* read generically for any
// recurring reminder, not treatment-specific) regardless of the entity being reminded about.
export function ReminderFields({
  frequency,
  reminderEnabled,
  onReminderEnabledChange,
  time,
  onTimeChange,
  reminderDay,
  onReminderDayChange,
}: ReminderFieldsProps) {
  const { t } = useTranslation();
  const showDaySelect = reminderEnabled && frequency !== "daily";
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={reminderEnabled}
            onChange={(e) => {
              onReminderEnabledChange(e.target.checked);
            }}
          />
        }
        label={t("treatments.form.enableReminder")}
        sx={{ mb: 1 }}
      />
      {reminderEnabled && (
        <TimePicker
          value={time}
          onChange={onTimeChange}
          label={t("treatments.form.reminderTime")}
          sx={{ width: "100%", mb: 2 }}
        />
      )}
      {showDaySelect && (
        <ReminderDaySelect
          frequency={frequency}
          value={reminderDay}
          onChange={onReminderDayChange}
        />
      )}
    </>
  );
}
