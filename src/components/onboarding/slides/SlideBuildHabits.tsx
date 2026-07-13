import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

function EmojiRow({ emojis, bgcolor }: { emojis: string[]; bgcolor: string }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
      {emojis.map((e) => (
        <Box
          key={e}
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            bgcolor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.7rem",
          }}
        >
          {e}
        </Box>
      ))}
    </Box>
  );
}

export function SlideBuildHabits() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t("tutorial.steps.buildHabits.title")}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
        <Chip label={t("common.tabs.reduce")} color="default" sx={{ fontWeight: 600 }} />
        <Typography sx={{ fontSize: "1.2rem", color: "text.secondary" }}>·</Typography>
        <Chip label={t("common.tabs.build")} color="primary" sx={{ fontWeight: 600 }} />
      </Box>
      <EmojiRow emojis={["🍺", "🚬", "📱", "🎰"]} bgcolor="action.hover" />
      <EmojiRow emojis={["🏃", "📖", "🧘", "💧"]} bgcolor="primary.light" />
      <Typography color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
        {t("tutorial.steps.buildHabits.body")}
      </Typography>
    </Box>
  );
}
