import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/shared";
import { usePositiveHabits } from "@/hooks";
import { getAllPositiveHabitLogs } from "@/db";
import { logError } from "@/utils/logger";
import { STATUS_CONFIG } from "@/theme/statusConfig";
import type { PositiveHabitLog } from "@/types";

interface HistoryItem extends PositiveHabitLog {
  habitLabel: string;
  habitIcon: string;
  habitColor: string;
}

export function BuildHistoryTab() {
  const { t } = useTranslation();
  const { positiveHabits, loadPositiveHabits, loading: habitsLoading } = usePositiveHabits();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    void loadPositiveHabits();
  }, [loadPositiveHabits]);

  useEffect(() => {
    const guard = { cancelled: false };
    async function load() {
      try {
        const allLogs = await getAllPositiveHabitLogs();
        if (guard.cancelled) return;
        const habitMap = new Map(positiveHabits.map((h) => [h.id, h]));
        const all: HistoryItem[] = allLogs.flatMap((log) => {
          const habit = habitMap.get(log.positiveHabitId);
          if (!habit) return [];
          return [
            { ...log, habitLabel: habit.label, habitIcon: habit.icon, habitColor: habit.color },
          ];
        });
        all.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
        setItems(all);
      } catch (e: unknown) {
        logError("BuildHistoryTab.load", e);
      } finally {
        if (!guard.cancelled) setHistoryLoading(false);
      }
    }
    void load();
    return () => {
      guard.cancelled = true;
    };
  }, [positiveHabits]);

  return (
    <Box sx={{ pb: "calc(96px + max(env(safe-area-inset-bottom), 28px))" }}>
      <Box sx={{ px: 2, pt: 2 }}>
        {items.length === 0 && !habitsLoading && !historyLoading && (
          <EmptyState emoji="🌻" message={t("history.emptyBuild")} />
        )}
        {items.map((item, idx) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <Box key={item.id}>
              <Box sx={{ display: "flex", gap: 2, py: 1.5 }}>
                <Box
                  sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: cfg.color,
                      flexShrink: 0,
                    }}
                  />
                  {idx < items.length - 1 && (
                    <Box sx={{ width: 2, bgcolor: "divider", flex: 1, mt: 0.5, minHeight: 16 }} />
                  )}
                </Box>
                <Box sx={{ pb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.scheduledAt.slice(0, 10)}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <SvgIcon
                      aria-hidden="true"
                      sx={{ width: 16, height: 16, color: item.habitColor, flexShrink: 0 }}
                    >
                      <path d={item.habitIcon} />
                    </SvgIcon>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: item.habitColor }}>
                      {item.habitLabel}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: cfg.color }}>
                    {t(`positiveHabits.${item.status}`)}
                  </Typography>
                </Box>
              </Box>
              {idx < items.length - 1 && <Divider sx={{ ml: 5 }} />}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
