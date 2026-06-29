import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export function SlideStats() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("tutorial.steps.stats.title")}</Typography>
      <Typography color="text.secondary">{t("tutorial.steps.stats.body")}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        {([
          { emoji: "🔥", value: "42", key: "stats.currentStreak" },
          { emoji: "⭐", value: "90", key: "stats.longestStreak" },
          { emoji: "🔄", value: "2",  key: "stats.totalRelapses" },
          { emoji: "📊", value: "28", key: "stats.averageStreak" },
        ] as const).map(({ emoji, value, key }) => (
          <Box key={key} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.4rem" }}>{emoji}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{t(key)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
