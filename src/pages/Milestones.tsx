import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { addDays, format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { EmptyState, GradeBadge, PageHeader } from "@/components/shared";
import { useHabits, useHabitLogs } from "@/hooks";
import { logError } from "@/utils/logger";
import { GRADES } from "@/utils/grades";
import { todayLocalDate } from "@/utils";
import type { HabitStats } from "@/types";

export function Milestones() {
  const { t } = useTranslation();
  const { habits, loadHabits } = useHabits();
  const { getStatsBatch } = useHabitLogs();
  const [statsMap, setStatsMap] = useState<Partial<Record<string, HabitStats>>>({});

  useEffect(() => { void loadHabits(); }, [loadHabits]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getStatsBatch(habits.map((h) => h.id)).then((map) => {
      if (!guard.cancelled) setStatsMap(map);
    }).catch((e: unknown) => { logError("Milestones.getStatsBatch", e); });
    return () => { guard.cancelled = true; };
  }, [habits, getStatsBatch]);

  const today = todayLocalDate();

  return (
    <Box sx={{ pb: "calc(96px + max(env(safe-area-inset-bottom), 28px))" }}>
      <PageHeader title={t("milestones.title")} />
      <Box sx={{ px: 2, pt: 1 }}>
        {habits.length === 0 && <EmptyState emoji="🏆" message={t("milestones.noHabits")} />}
        {habits.map((habit) => {
          const stats = statsMap[habit.id];
          const streak = stats?.currentStreak ?? 0;
          return (
            <Box key={habit.id} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: habit.color, mb: 1 }}>
                {habit.label}
              </Typography>
              {GRADES.map((grade) => {
                const unlocked = streak >= grade.days;
                const daysLeft = grade.days - streak;
                const unlockDateStr = format(addDays(parseISO(today), grade.days - streak), "yyyy-MM-dd");
                return (
                  <Box key={grade.days} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, opacity: unlocked ? 1 : 0.45 }}>
                    <Typography aria-hidden="true" sx={{ fontSize: "1.4rem", width: 32 }}>{grade.emoji}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: unlocked ? 600 : 400, color: unlocked ? grade.color : "text.disabled" }}>
                        {t(grade.labelKey)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {grade.days} {t("common.day", { count: grade.days })} -{" "}
                        {unlocked ? t("milestones.unlocked", { date: unlockDateStr }) : t("milestones.daysNeeded_other", { count: daysLeft })}
                      </Typography>
                    </Box>
                    {unlocked && <GradeBadge grade={grade} size="sm" />}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
