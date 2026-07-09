import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { EmptyStateProps } from "@/types";

export function EmptyState({ emoji, message }: EmptyStateProps) {
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
    </Box>
  );
}
