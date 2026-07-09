import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { EmptyState, GradeBadge, PageHeader } from "@/components/shared";
import { HabitMilestoneTab } from "@/components/habits";
import { useHabits, useHabitLogs } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { COLORS } from "@/theme/tokens";
import { logError } from "@/utils/logger";
import { getGrade } from "@/utils/grades";
import type { HabitStats } from "@/types";

const CHEVRON_DOWN = "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z";

export function Milestones() {
  const { t } = useTranslation();
  const { habits, loadHabits, loading: habitsLoading } = useHabits();
  const { getStatsBatch } = useHabitLogs();
  const userName = useOnboardingStore((s) => s.userName);
  const [statsMap, setStatsMap] = useState<Partial<Record<string, HabitStats>>>({});

  useEffect(() => {
    void loadHabits();
  }, [loadHabits]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getStatsBatch(habits.map((h) => h.id))
      .then((map) => {
        if (!guard.cancelled) setStatsMap(map);
      })
      .catch((e: unknown) => {
        logError("Milestones.getStatsBatch", e);
      });
    return () => {
      guard.cancelled = true;
    };
  }, [habits, getStatsBatch]);

  return (
    <Box sx={{ pb: "calc(96px + max(env(safe-area-inset-bottom), 28px))" }}>
      <PageHeader title={t("milestones.title")} />
      <Box sx={{ px: 2, pt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {habits.length === 0 && !habitsLoading && (
          <EmptyState emoji="🏆" message={t("milestones.noHabits")} />
        )}
        {habits.map((habit, index) => {
          const stats = statsMap[habit.id];
          const grade = getGrade(stats?.currentStreak ?? 0);
          return (
            <Accordion
              key={habit.id}
              defaultExpanded={index === 0}
              elevation={0}
              disableGutters
              sx={{
                border: `0.5px solid ${COLORS.cardBorder}`,
                borderRadius: "16px",
                "&.MuiAccordion-root": { borderRadius: "16px" },
                "&:before": { display: "none" },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <SvgIcon aria-hidden="true" sx={{ color: "text.secondary" }}>
                    <path d={CHEVRON_DOWN} />
                  </SvgIcon>
                }
                sx={{ minHeight: 56, px: 2 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flex: 1,
                    minWidth: 0,
                    pr: 1,
                  }}
                >
                  <SvgIcon
                    aria-hidden="true"
                    sx={{ width: 20, height: 20, color: habit.color, flexShrink: 0 }}
                  >
                    <path d={habit.icon} />
                  </SvgIcon>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
                    noWrap
                  >
                    {habit.label}
                  </Typography>
                  <GradeBadge grade={grade} size="sm" />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                {stats ? (
                  <HabitMilestoneTab stats={stats} userName={userName} />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {t("common.loading")}
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
}
