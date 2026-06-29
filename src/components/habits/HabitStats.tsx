import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { COLORS } from "@/theme/tokens";
import type { HabitStatsProps } from "@/types";

interface StatItemProps {
  label: string;
  value: number;
  color: string;
}

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2, textAlign: "center", bgcolor: "action.hover", borderRadius: 2 }}
    >
      <Typography sx={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

export function HabitStats({ stats }: HabitStatsProps) {
  const { t } = useTranslation();
  return (
    <Grid container spacing={2}>
      <Grid size={6}>
        <StatItem label={t("stats.currentStreak")} value={stats.currentStreak} color={COLORS.eventStart} />
      </Grid>
      <Grid size={6}>
        <StatItem label={t("stats.longestStreak")} value={stats.longestStreak} color="#2e7d32" />
      </Grid>
      <Grid size={6}>
        <StatItem label={t("stats.totalRelapses")} value={stats.totalRelapses} color="#ff8f00" />
      </Grid>
      <Grid size={6}>
        <StatItem label={t("stats.averageStreak")} value={stats.averageStreak} color="#546e7a" />
      </Grid>
    </Grid>
  );
}
