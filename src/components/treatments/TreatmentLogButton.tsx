import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import type { TreatmentLogButtonProps } from "@/types";

export function TreatmentLogButton({ todayLog, onLog }: TreatmentLogButtonProps) {
  const { t } = useTranslation();
  const status = todayLog?.status;
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Button
        variant={status === "taken" ? "contained" : "outlined"}
        color="success"
        onClick={() => { onLog("taken"); }}
        aria-label={t("treatments.taken")}
        sx={{ minHeight: 44, flex: 1, borderRadius: 2 }}
      >
        ✅ {t("treatments.taken")}
      </Button>
      <Button
        variant={status === "missed" ? "contained" : "outlined"}
        color="error"
        onClick={() => { onLog("missed"); }}
        aria-label={t("treatments.missed")}
        sx={{ minHeight: 44, flex: 1, borderRadius: 2 }}
      >
        ❌ {t("treatments.missed")}
      </Button>
    </Box>
  );
}
