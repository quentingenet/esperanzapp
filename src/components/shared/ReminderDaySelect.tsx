import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useTranslation } from "react-i18next";
import { weekDayLabel, WEEK_DAYS, MONTH_DAYS } from "@/utils/reminderUtils";
import { useDateLocale } from "@/hooks";
import type { Frequency } from "@/types";

interface ReminderDaySelectProps {
  frequency: Frequency;
  value: number | null;
  onChange: (value: number) => void;
}

export function ReminderDaySelect({ frequency, value, onChange }: ReminderDaySelectProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  return (
    <Select
      fullWidth
      value={value ?? ""}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      sx={{ mb: 2 }}
      displayEmpty
      MenuProps={{
        slotProps: {
          paper: { sx: { maxHeight: "50vh", pb: "env(safe-area-inset-bottom)" } },
        },
      }}
    >
      <MenuItem value="" disabled>
        {t("treatments.form.reminderDay")}
      </MenuItem>
      {frequency === "weekly"
        ? WEEK_DAYS.map((d) => (
            <MenuItem key={d} value={d}>
              {weekDayLabel(d, dateLocale)}
            </MenuItem>
          ))
        : MONTH_DAYS.map((d) => (
            <MenuItem key={d.key} value={d.value}>
              {d.key === "firstDay"
                ? t("treatments.form.firstDay")
                : d.key === "lastDay"
                  ? t("treatments.form.lastDay")
                  : t("treatments.form.dayOfMonth", { day: d.value })}
            </MenuItem>
          ))}
    </Select>
  );
}
