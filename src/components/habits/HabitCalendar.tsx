import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { PickerDay } from "@mui/x-date-pickers/PickerDay";
import type { PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useCalendar, useDateLocale } from "@/hooks";
import { COLORS } from "@/theme/tokens";
import type { DayStatus, HabitCalendarProps } from "@/types";

const DOT_COLORS: Partial<Record<DayStatus, string>> = {
  start:   COLORS.eventStart,
  active:  "#2e7d32",
  relapse: COLORS.eventRelapse,
};

export function HabitCalendar({ habitId }: HabitCalendarProps) {
  const { t } = useTranslation();
  const { getHabitDayStatusMap } = useCalendar();
  const dateLocale = useDateLocale();
  const [statusMap, setStatusMap] = useState<Record<string, DayStatus>>({});

  useEffect(() => {
    const guard = { cancelled: false };
    void getHabitDayStatusMap(habitId).then((map) => {
      if (!guard.cancelled) setStatusMap(map);
    });
    return () => { guard.cancelled = true; };
  }, [habitId, getHabitDayStatusMap]);

  const CustomDay = useCallback((props: PickerDayProps) => {
    const dateStr = format(props.day, "yyyy-MM-dd");
    const status = statusMap[dateStr];
    const dotColor = status !== undefined ? DOT_COLORS[status] : undefined;
    const dayLabel = format(props.day, "PP", { locale: dateLocale });
    const ariaLabel = status !== undefined ? `${dayLabel}, ${t(`history.${status}`)}` : dayLabel;
    return (
      <Box sx={{ position: "relative" }}>
        <PickerDay {...props} aria-label={ariaLabel} />
        {dotColor !== undefined && (
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              bottom: 2,
              left: "50%",
              transform: "translateX(-50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: dotColor,
              pointerEvents: "none",
            }}
          />
        )}
      </Box>
    );
  }, [statusMap, t, dateLocale]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
      <DateCalendar
        readOnly
        slots={{ day: CustomDay as React.ComponentType<PickerDayProps> }}
        sx={{ width: "100%" }}
      />
    </LocalizationProvider>
  );
}
