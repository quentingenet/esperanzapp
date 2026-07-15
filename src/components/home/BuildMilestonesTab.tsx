import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { EmptyState, GradeBadge } from "@/components/shared";
import { PositiveHabitMilestoneTab } from "@/components/positiveHabits";
import { usePositiveHabits, usePositiveHabitLogs } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { COLORS } from "@/theme/tokens";
import { logError } from "@/utils/logger";
import { getGrade } from "@/utils/grades";
import { POSITIVE_GRADES } from "@/utils/positiveGrades";

const CHEVRON_DOWN = "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z";

export function BuildMilestonesTab() {
  const { t } = useTranslation();
  const { positiveHabits, loadPositiveHabits, loading: habitsLoading } = usePositiveHabits();
  const { getTakenCount } = usePositiveHabitLogs();
  const userName = useOnboardingStore((s) => s.userName);
  const [countsMap, setCountsMap] = useState<Partial<Record<string, number>>>({});

  useEffect(() => {
    void loadPositiveHabits();
  }, [loadPositiveHabits]);

  useEffect(() => {
    const guard = { cancelled: false };
    void Promise.all(positiveHabits.map(async (h) => [h.id, await getTakenCount(h.id)] as const))
      .then((entries) => {
        if (!guard.cancelled) setCountsMap(Object.fromEntries(entries));
      })
      .catch((e: unknown) => {
        logError("BuildMilestonesTab.getTakenCounts", e);
      });
    return () => {
      guard.cancelled = true;
    };
  }, [positiveHabits, getTakenCount]);

  return (
    <Box sx={{ pb: "calc(96px + max(env(safe-area-inset-bottom), 28px))" }}>
      <Box sx={{ px: 2, pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {positiveHabits.length === 0 && !habitsLoading && (
          <EmptyState emoji="🏆" message={t("milestones.noPositiveHabits")} />
        )}
        {positiveHabits.map((habit, index) => {
          const count = countsMap[habit.id];
          const grade = getGrade(count ?? 0, POSITIVE_GRADES);
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
                {count !== undefined ? (
                  <PositiveHabitMilestoneTab takenCount={count} userName={userName} />
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
