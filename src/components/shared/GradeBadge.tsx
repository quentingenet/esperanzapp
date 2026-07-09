import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { GradeBadgeProps } from "@/types";

const SIZE_STYLES = {
  sm: { px: 1, py: 0.25, fontSize: "0.7rem" },
  md: { px: 1.5, py: 0.5, fontSize: "0.85rem" },
  lg: { px: 2, py: 0.75, fontSize: "1rem" },
} as const;

export function GradeBadge({ grade, size = "md" }: GradeBadgeProps) {
  const { t } = useTranslation();
  const s = SIZE_STYLES[size];
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: s.px,
        py: s.py,
        borderRadius: "999px",
        bgcolor: grade.bgColor,
        color: grade.color,
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: s.fontSize, lineHeight: 1.2, fontWeight: 600, color: "inherit" }}
      >
        <span aria-hidden="true">{grade.emoji}</span> {t(grade.labelKey)}
      </Typography>
    </Box>
  );
}
