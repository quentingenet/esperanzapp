import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PieChart } from "@mui/x-charts/PieChart";
import { useTranslation } from "react-i18next";
import { COLORS } from "@/theme/tokens";
import type { Habit, HabitStats } from "@/types";

interface HabitStatsTabProps {
  stats: HabitStats;
  habit: Habit;
}

export function HabitStatsTab({ stats, habit }: HabitStatsTabProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ pt: 1 }}>
      {stats.currentStreak === 0 && stats.totalRelapses === 0 ? (
        <Typography color="text.secondary" sx={{ py: 5, textAlign: "center" }}>
          {t("stats.noData")}
        </Typography>
      ) : (
        <>
          <Box sx={{ position: "relative", width: 240, height: 240, mx: "auto" }}>
            <PieChart
              series={[
                {
                  data: [
                    ...(stats.currentStreak > 0
                      ? [{ id: 0, value: stats.currentStreak, color: habit.color }]
                      : []),
                    ...(stats.totalRelapses > 0
                      ? [{ id: 1, value: stats.totalRelapses, color: COLORS.streakBlue }]
                      : []),
                  ],
                  innerRadius: 62,
                  outerRadius: 100,
                  paddingAngle: stats.currentStreak > 0 && stats.totalRelapses > 0 ? 3 : 0,
                  cornerRadius: 4,
                  cx: 120,
                  cy: 120,
                },
              ]}
              slots={{ legend: () => null }}
              margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
              width={240}
              height={240}
            />
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 700, color: habit.color, lineHeight: 1 }}>
                {stats.currentStreak}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("common.day_other")}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 2.5 }}>
            {stats.currentStreak > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: habit.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption">
                  {t("stats.currentStreak")} · {stats.currentStreak}
                </Typography>
              </Box>
            )}
            {stats.totalRelapses > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: COLORS.streakBlue,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption">
                  {t("stats.totalRelapses")} · {stats.totalRelapses}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {(
              [
                { key: "stats.currentStreak", value: stats.currentStreak, color: habit.color },
                {
                  key: "stats.longestStreak",
                  value: stats.longestStreak,
                  color: COLORS.successGreen,
                },
                {
                  key: "stats.totalRelapses",
                  value: stats.totalRelapses,
                  color: COLORS.streakBlue,
                },
                {
                  key: "stats.averageStreak",
                  value: Math.round(stats.averageStreak),
                  color: COLORS.successGreen,
                },
              ] as const
            ).map(({ key, value, color }) => (
              <Box
                key={key}
                sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", textAlign: "center" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color }}>
                  {value}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1.2, display: "block" }}
                >
                  {t(key)}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
