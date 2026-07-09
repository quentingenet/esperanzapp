import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { EmptyStateProps } from "@/types";

export function EmptyState({ emoji, message, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        py: 8,
        px: 3,
        textAlign: "center",
      }}
    >
      {emoji && (
        <Typography aria-hidden="true" sx={{ fontSize: "3rem", lineHeight: 1 }}>
          {emoji}
        </Typography>
      )}
      <Typography color="text.secondary" sx={{ fontSize: "1rem", maxWidth: 280 }}>
        {message}
      </Typography>
      {ctaLabel && onCta && (
        <Button
          variant="contained"
          onClick={onCta}
          aria-label={ctaLabel}
          sx={{ minHeight: 44, borderRadius: 2, mt: 1 }}
        >
          {ctaLabel}
        </Button>
      )}
    </Box>
  );
}
