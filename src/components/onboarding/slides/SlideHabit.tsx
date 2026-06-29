import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

const CLOUD_ITEMS = [
  { key: "alcohol",      size: "1.3rem",  opacity: 0.9,  color: "error.main",     rotate: -3, weight: 700 },
  { key: "tobacco",      size: "0.85rem", opacity: 0.45, color: "text.secondary", rotate:  5, weight: 400 },
  { key: "sugar",        size: "1.0rem",  opacity: 0.65, color: "primary.main",   rotate: -1, weight: 600 },
  { key: "cannabis",     size: "0.75rem", opacity: 0.4,  color: "text.disabled",  rotate:  8, weight: 400 },
  { key: "social_media", size: "1.4rem",  opacity: 0.85, color: "text.primary",   rotate: -5, weight: 800 },
  { key: "gaming",       size: "0.9rem",  opacity: 0.55, color: "warning.main",   rotate:  4, weight: 500 },
  { key: "fast_food",    size: "0.7rem",  opacity: 0.35, color: "secondary.main", rotate: -7, weight: 400 },
  { key: "screens",      size: "1.1rem",  opacity: 0.7,  color: "error.light",    rotate:  3, weight: 600 },
  { key: "caffeine",     size: "0.8rem",  opacity: 0.5,  color: "primary.light",  rotate: -4, weight: 400 },
  { key: "shopping",     size: "1.05rem", opacity: 0.6,  color: "text.secondary", rotate:  6, weight: 500 },
] as const;

function HabitWordCloud() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", alignItems: "center", py: 1.5, px: 1, borderRadius: 3, bgcolor: "action.hover" }}>
      {CLOUD_ITEMS.map(({ key, size, opacity, color, rotate, weight }) => (
        <Typography
          key={key}
          sx={{ fontSize: size, opacity, color, fontWeight: weight, transform: `rotate(${String(rotate)}deg)`, userSelect: "none", lineHeight: 1.4 }}
        >
          {t(`habitTypes.${key}.label`)}
        </Typography>
      ))}
    </Box>
  );
}

export function SlideHabit() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("tutorial.steps.counter.title")}</Typography>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
        {["🍺", "🚬", "🍬", "🎰", "📱"].map((e) => (
          <Box key={e} sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem" }}>
            {e}
          </Box>
        ))}
      </Box>
      <HabitWordCloud />
      <Typography color="text.secondary">{t("tutorial.steps.counter.body")}</Typography>
    </Box>
  );
}
