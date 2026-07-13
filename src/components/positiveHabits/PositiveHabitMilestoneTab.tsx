import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { GradeBadge } from "@/components/shared";
import { getGrade } from "@/utils/grades";
import { POSITIVE_GRADES } from "@/utils/positiveGrades";

interface PositiveHabitMilestoneTabProps {
  takenCount: number;
  userName: string;
}

// Mirrors HabitMilestoneTab.tsx's shape, but count-based instead of date-based: a positive
// habit's next milestone can't be pinned to a calendar date (it depends on future check-ins),
// so this shows "N left" instead of "unlocked on <date>".
export function PositiveHabitMilestoneTab({ takenCount, userName }: PositiveHabitMilestoneTabProps) {
  const { t } = useTranslation();

  return (
    <Box>
      {takenCount >= 1 &&
        (() => {
          const current = getGrade(takenCount, POSITIVE_GRADES);
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
      {POSITIVE_GRADES.map((grade) => {
        const unlocked = takenCount >= grade.threshold;
        const countLeft = grade.threshold - takenCount;
        return (
          <Box
            key={grade.threshold}
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
                {unlocked
                  ? t("milestones.unlockedBuild")
                  : t("milestones.countNeeded", { count: countLeft })}
              </Typography>
            </Box>
            {unlocked && <GradeBadge grade={grade} size="sm" />}
          </Box>
        );
      })}
    </Box>
  );
}
