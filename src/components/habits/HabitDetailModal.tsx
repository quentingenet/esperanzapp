import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { RelapseDialog } from "./RelapseDialog";
import { HabitMilestoneTab } from "./HabitMilestoneTab";
import { HabitHistoryTab } from "./HabitHistoryTab";
import { HabitStatsTab } from "./HabitStatsTab";
import { useHabitLogs } from "@/hooks";
import { logError } from "@/utils/logger";
import { mergeRelapseRestart } from "@/utils/habitLogUtils";
import type { Habit, HabitLog, HabitStats } from "@/types";

export interface HistoryEntry extends HabitLog {
  displayKey?: string;
}

interface HabitDetailModalProps {
  habit: Habit;
  stats: HabitStats;
  userName: string;
  onClose: () => void;
  onRelapse: (date: string) => void;
}

export function HabitDetailModal({ habit, stats, userName, onClose, onRelapse }: HabitDetailModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [relapseOpen, setRelapseOpen] = useState(false);
  const { getLogsByHabit } = useHabitLogs();
  const [rawLogs, setRawLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getLogsByHabit(habit.id).then((logs) => {
      if (!guard.cancelled) setRawLogs(logs);
    }).catch((e: unknown) => { logError("HabitDetailModal.getLogsByHabit", e); });
    return () => { guard.cancelled = true; };
  }, [habit.id, getLogsByHabit]);

  const sorted = [...rawLogs].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const mergedLogs: HistoryEntry[] = mergeRelapseRestart(sorted);

  return (
    <>
      <Dialog open fullWidth maxWidth="sm" onClose={onClose} slotProps={{ paper: { sx: { borderRadius: 3, m: 2, height: "80dvh", maxHeight: "80dvh", display: "flex", flexDirection: "column" } } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, pt: 2, pb: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: habit.color, flexShrink: 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>{habit.label}</Typography>
          <IconButton onClick={onClose} size="small" aria-label={t("common.close")}>
            <SvgIcon fontSize="small"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></SvgIcon>
          </IconButton>
        </Box>

        <Box sx={{ px: 2, pb: 1.5 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            fullWidth
            onClick={() => { setRelapseOpen(true); }}
            sx={{ borderRadius: 2, minHeight: 40 }}
          >
            {t("habitDetail.relapse")}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v: number) => { setTab(v); }} variant="fullWidth" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label={t("habitDetail.milestones")} sx={{ fontSize: "0.82rem" }} />
          <Tab label={t("habitDetail.history")} sx={{ fontSize: "0.82rem" }} />
          <Tab label={t("habitDetail.stats")} sx={{ fontSize: "0.82rem" }} />
        </Tabs>

        <DialogContent sx={{ px: 2, py: 1.5, flex: 1, overflowY: "auto" }}>
          {tab === 0 && <HabitMilestoneTab stats={stats} userName={userName} />}
          {tab === 1 && <HabitHistoryTab logs={mergedLogs} />}
          {tab === 2 && <HabitStatsTab stats={stats} habit={habit} />}
        </DialogContent>
      </Dialog>

      <RelapseDialog
        open={relapseOpen}
        habit={habit}
        stats={stats}
        userName={userName}
        onConfirm={(date) => { setRelapseOpen(false); onRelapse(date); }}
        onCancel={() => { setRelapseOpen(false); }}
      />
    </>
  );
}
