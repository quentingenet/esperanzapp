import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks";
import { COLORS } from "@/theme/tokens";
import type { HistoryEntry } from "./HabitDetailModal";

const EVENT_COLORS = { start: COLORS.streakBlue, relapse: COLORS.relapseOrange } as const;

interface HabitHistoryTabProps {
  logs: HistoryEntry[];
}

export function HabitHistoryTab({ logs }: HabitHistoryTabProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  return (
    <Box>
      {logs.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          {t("history.empty")}
        </Typography>
      )}
      {logs.map((log, idx) => (
        <Box key={log.id}>
          <Box sx={{ display: "flex", gap: 2, py: 1.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: EVENT_COLORS[log.eventType], flexShrink: 0 }} />
              {idx < logs.length - 1 && <Box sx={{ width: 2, bgcolor: "divider", flex: 1, mt: 0.5, minHeight: 14 }} />}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{format(parseISO(log.eventDate.slice(0, 10)), "P", { locale: dateLocale })}</Typography>
              <Typography variant="body2" color={log.eventType === "relapse" ? "error" : "primary"}>
                {t(log.displayKey ?? `history.${log.eventType}`)}
              </Typography>
            </Box>
          </Box>
          {idx < logs.length - 1 && <Divider sx={{ ml: 4.5 }} />}
        </Box>
      ))}
    </Box>
  );
}
