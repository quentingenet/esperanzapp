import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export function SlideProgress() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("tutorial.steps.milestones.title")}</Typography>
      <Typography color="text.secondary">{t("tutorial.steps.milestones.body")}</Typography>
      <Card elevation={2} sx={{ borderRadius: 3, textAlign: "center", py: 1 }}>
        <CardContent>
          <Typography sx={{ fontSize: "4rem", fontWeight: 800, color: "primary.main", lineHeight: 1 }}>42</Typography>
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", mt: 1 }}>
            {["🌱", "🌿", "🪨", "🏔️", "💧"].map((e) => (
              <Typography key={e} sx={{ fontSize: "1.3rem" }}>{e}</Typography>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
