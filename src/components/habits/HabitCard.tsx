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
const GRIP_PATH = "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";

function formatStreakDisplay(days: number, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (days < 365) return { main: null, sub: null };
  const years = Math.floor(days / 365);
  const rem = days % 365;
  const yearStr = `${String(years)} ${t("habits.streak.year", { count: years })}`;
  const main = rem > 0
    ? `${yearStr} ${t("habits.streak.separator")} ${String(rem)} ${t("common.day", { count: rem })}`
    : yearStr;
  return { main, sub: t("habits.streak.total", { count: days }) };
}

export function HabitCard({ habit, stats, grade, nextGrade, onClick, onDelete, handleProps }: HabitCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const progress = getProgressToNext(stats.currentStreak);
  const formattedStart = format(parseISO(stats.startDate), "P", { locale: dateLocale });
  const formattedLastRelapse = stats.lastRelapseDate
    ? format(parseISO(stats.lastRelapseDate), "P", { locale: dateLocale })
    : null;
  const streakDisplay = formatStreakDisplay(stats.currentStreak, t as (key: string, opts?: Record<string, unknown>) => string);

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
              {formattedLastRelapse && (
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.25 }}>
                  {t("habits.counter.lastRelapse", { date: formattedLastRelapse })}
                </Typography>
              )}
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
                    {"→ "}{t(nextGrade.grade.labelKey)}{" "}{t("grades.daysLeft", { count: nextGrade.daysLeft })}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ textAlign: "center", flexShrink: 0, minWidth: 72 }}>
              {streakDisplay.main ? (
                <>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.3, color: grade.color }}>
                    {streakDisplay.main}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {streakDisplay.sub}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography sx={{ fontSize: "3.5rem", fontWeight: 500, lineHeight: 1, color: grade.color }}>
                    {stats.currentStreak}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("common.day", { count: stats.currentStreak })}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
      <Box sx={{ display: "flex", justifyContent: handleProps ? "space-between" : "flex-end", alignItems: "center", px: 1, pb: 0.5, position: "relative" }}>
        <Typography
          component="span"
          variant="caption"
          color="text.disabled"
          sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: "10px", letterSpacing: 0.3, pointerEvents: "none" }}
        >
          {t("habits.seeMore")}
        </Typography>
        {handleProps && (
          <span
            {...handleProps}
            aria-label={t("common.reorder")}
            style={{ display: "inline-flex", alignItems: "center", padding: 4, cursor: "grab", touchAction: "none", color: "inherit", opacity: 0.4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d={GRIP_PATH} fill="currentColor" />
            </svg>
          </span>
        )}
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
