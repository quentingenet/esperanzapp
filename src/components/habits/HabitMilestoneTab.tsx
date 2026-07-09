import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { addDays, format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks";
import { todayLocalDate } from "@/utils";
import { GradeBadge } from "@/components/shared";
import { GRADES, getGrade } from "@/utils/grades";
import type { HabitStats } from "@/types";

interface HabitMilestoneTabProps {
  stats: HabitStats;
  userName: string;
}

export function HabitMilestoneTab({ stats, userName }: HabitMilestoneTabProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const today = todayLocalDate();

  return (
    <Box>
      {stats.currentStreak >= 1 &&
        (() => {
          const current = getGrade(stats.currentStreak);
          return (
            <Box
              sx={{
                p: 1.5,
                mb: 1.5,
                borderRadius: 2,
                bgcolor: current.bgColor,
                borderLeft: `3px solid ${current.color}`,
              }}
            >
              <Typography variant="body2" sx={{ color: current.color, fontStyle: "italic" }}>
                {t(current.messageKey, { name: userName })}
              </Typography>
            </Box>
          );
        })()}
      {GRADES.map((grade) => {
        const unlocked = stats.currentStreak >= grade.days;
        const daysLeft = grade.days - stats.currentStreak;
        const unlockDateStr = format(
          addDays(parseISO(today), grade.days - stats.currentStreak),
          "P",
          { locale: dateLocale },
        );
        return (
          <Box
            key={grade.days}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 0.75,
              opacity: unlocked ? 1 : 0.45,
            }}
          >
            <Typography aria-hidden="true" sx={{ fontSize: "1.4rem", width: 32 }}>
              {grade.emoji}
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: unlocked ? 600 : 400,
                  color: unlocked ? grade.color : "text.disabled",
                }}
              >
                {t(grade.labelKey)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {grade.days} {t("common.day", { count: grade.days })} -{" "}
                {unlocked
                  ? t("milestones.unlocked", { date: unlockDateStr })
                  : t("milestones.daysNeeded", { count: daysLeft })}
              </Typography>
            </Box>
            {unlocked && <GradeBadge grade={grade} size="sm" />}
          </Box>
        );
      })}
    </Box>
  );
}
