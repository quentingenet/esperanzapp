import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export function SlideRelapse() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t("tutorial.steps.relapse.title")}
      </Typography>
      <Typography color="text.secondary">{t("tutorial.steps.relapse.body")}</Typography>
      <Paper
        elevation={1}
        sx={{
          p: 3,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "error.light",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography sx={{ fontSize: "2.5rem" }}>🔄</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box
            sx={{ height: 44, width: 110, borderRadius: 1.5, bgcolor: "error.main", opacity: 0.75 }}
          />
          <Box sx={{ height: 44, width: 110, borderRadius: 1.5, bgcolor: "action.hover" }} />
        </Box>
      </Paper>
    </Box>
  );
}
