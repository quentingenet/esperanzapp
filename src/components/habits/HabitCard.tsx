import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { useDateLocale } from "@/hooks";
import type { HabitCardProps } from "@/types";
import { getProgressToNext } from "@/utils/grades";

const DELETE_PATH = "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";

export function HabitCard({ habit, stats, grade, nextGrade, onClick, onDelete }: HabitCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const progress = getProgressToNext(stats.currentStreak);
  const formattedStart = format(parseISO(stats.startDate), "P", { locale: dateLocale });

  return (
    <Card elevation={0} sx={{ border: "0.5px solid #c5ddf0", borderRadius: "16px" }}>
      <CardActionArea onClick={onClick} aria-label={habit.label} sx={{ minHeight: 44 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <SvgIcon aria-hidden="true" sx={{ width: 20, height: 20, color: habit.color }}>
                  <path d={habit.icon} />
                </SvgIcon>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {habit.label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {t("habits.counter.since", { label: habit.label.toLowerCase(), date: formattedStart })}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  mt: 1.5, mb: 1, height: 6, borderRadius: 3,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": { bgcolor: grade.color },
                }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <GradeBadge grade={grade} size="sm" />
                {nextGrade && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px" }}>
                    {"→ "}{t(nextGrade.grade.labelKey)}{" "}{t("grades.daysLeft_other", { count: nextGrade.daysLeft })}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ textAlign: "center", flexShrink: 0 }}>
              <Typography sx={{ fontSize: "3.5rem", fontWeight: 500, lineHeight: 1, color: grade.color }}>
                {stats.currentStreak}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("common.day", { count: stats.currentStreak })}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, pb: 0.5 }}>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={t("common.delete")}
          sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
        >
          <SvgIcon fontSize="small" aria-hidden="true"><path d={DELETE_PATH} /></SvgIcon>
        </IconButton>
      </Box>
    </Card>
  );
}
