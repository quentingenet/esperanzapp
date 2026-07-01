import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { EmptyState, PageHeader } from "@/components/shared";
import { useHabits } from "@/hooks";
import { getAllHabitLogs } from "@/db";
import { COLORS } from "@/theme/tokens";
import type { HabitLog } from "@/types";

interface HistoryItem extends HabitLog {
  habitLabel: string;
  habitColor: string;
  displayKey?: string;
}

const EVENT_COLORS = { start: COLORS.eventStart, relapse: COLORS.eventRelapse } as const;

export function History() {
  const { t } = useTranslation();
  const { habits, loadHabits } = useHabits();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => { void loadHabits(); }, [loadHabits]);

  useEffect(() => {
    async function load() {
      const allLogs = await getAllHabitLogs();
      const habitMap = new Map(habits.map((h) => [h.id, h]));
      const all: HistoryItem[] = allLogs.flatMap((log) => {
        const habit = habitMap.get(log.habitId);
        if (!habit) return [];
        return [{ ...log, habitLabel: habit.label, habitColor: habit.color }];
      });
      all.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

      // Merge relapse+start pairs on the same date into a single entry
      const relapseKeys = new Set(
        all.filter((i) => i.eventType === "relapse").map((i) => `${i.habitId}:${i.eventDate}`),
      );
      const merged = all
        .filter((i) => !(i.eventType === "start" && relapseKeys.has(`${i.habitId}:${i.eventDate}`)))
        .map((i) => i.eventType === "relapse" && relapseKeys.has(`${i.habitId}:${i.eventDate}`)
          ? { ...i, displayKey: "history.relapseRestart" }
          : i,
        );

      setItems(merged);
    }
    void load();
  }, [habits]);

  return (
    <Box sx={{ pb: "calc(96px + max(env(safe-area-inset-bottom), 28px))" }}>
      <PageHeader title={t("history.title")} />
      <Box sx={{ px: 2, pt: 1 }}>
        {items.length === 0 && <EmptyState emoji="📅" message={t("history.empty")} />}
        {items.map((item, idx) => (
          <Box key={item.id}>
            <Box sx={{ display: "flex", gap: 2, py: 1.5 }}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: EVENT_COLORS[item.eventType], flexShrink: 0 }} />
                {idx < items.length - 1 && <Box sx={{ width: 2, bgcolor: "divider", flex: 1, mt: 0.5, minHeight: 16 }} />}
              </Box>
              <Box sx={{ pb: 1 }}>
                <Typography variant="caption" color="text.secondary">{item.eventDate.slice(0, 10)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: item.habitColor }}>{item.habitLabel}</Typography>
                <Typography variant="body2" color={item.eventType === "relapse" ? "error" : "primary"}>
                  {t(item.displayKey ?? `history.${item.eventType}`)}
                </Typography>
              </Box>
            </Box>
            {idx < items.length - 1 && <Divider sx={{ ml: 5 }} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
