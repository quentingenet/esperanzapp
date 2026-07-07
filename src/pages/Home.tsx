import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { HabitCard, HabitDetailModal, HabitForm } from "@/components/habits";
import { ConfirmDialog, EmptyState, SortableList } from "@/components/shared";
import { useHabits, useHabitLogs, useNotifications } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { toast } from "@/store/toastStore";
import { getGrade, getNextGrade } from "@/utils/grades";
import { cancelMilestoneNotifications, scheduleMilestoneNotifications, rescheduleAllMilestoneNotifications } from "@/utils/milestoneNotifications";
import { logError } from "@/utils/logger";
import type { Habit, HabitStats } from "@/types";

import { SORT_PATH, CHECK_PATH } from "@/utils/svgPaths";

export function Home() {
  const { t } = useTranslation();
  const { habits, loading: habitsLoading, error: habitsError, loadHabits, addHabitWithInitialLog, deleteHabit, reorderHabits, saveHabitsOrder } = useHabits();
  const { getStatsBatch, recordRelapse } = useHabitLogs();
  const { getPermissionStatus, requestPermission, getExactAlarmStatus, openExactAlarmSettings } = useNotifications();
  const userName = useOnboardingStore((s) => s.userName);
  const [statsMap, setStatsMap] = useState<Partial<Record<string, HabitStats>>>({});
  const [detailHabit, setDetailHabit] = useState<{ habit: Habit; stats: HabitStats } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [sortMode, setSortMode] = useState(false);
  const isSavingOrderRef = useRef(false);
  const statsLoadSeqRef = useRef(0);

  useEffect(() => { void loadHabits(); }, [loadHabits]);
  useEffect(() => { if (habitsError) toast.error(t("common.error")); }, [habitsError, t]);

  useEffect(() => {
    const seq = ++statsLoadSeqRef.current;
    void getStatsBatch(habits.map((h) => h.id)).then((map) => {
      if (seq === statsLoadSeqRef.current) setStatsMap(map);
    }).catch((e: unknown) => { logError("Home.getStatsBatch", e); });
  }, [habits, getStatsBatch]);

  const handleRelapse = (habit: Habit, date: string) => {
    void recordRelapse(habit.id, date)
      .then(() => {
        void cancelMilestoneNotifications(habit.id)
          .then(() => scheduleMilestoneNotifications(habit.id, habit.label, date))
          .catch((e: unknown) => { logError("Home.handleRelapse.notifications", e); });
        void loadHabits();
        setDetailHabit(null);
      })
      .catch((e: unknown) => { logError("Home.handleRelapse", e); toast.error(t("common.error")); });
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;
    void deleteHabit(deleteTarget.id)
      .then(() => { toast.success(t("common.deleted")); void loadHabits(); })
      .catch((e: unknown) => { logError("Home.handleDelete", e); toast.error(t("common.error")); });
    setDeleteTarget(null);
  };

  const handleExitSort = useCallback(() => {
    if (isSavingOrderRef.current) return;
    isSavingOrderRef.current = true;
    setSortMode(false);
    void saveHabitsOrder()
      .catch((e: unknown) => {
        logError("Home.saveHabitsOrder", e);
        toast.error(t("common.error"));
        void loadHabits();
      })
      .finally(() => { isSavingOrderRef.current = false; });
  }, [saveHabitsOrder, t, loadHabits]);

  const sortableHabits = habits.filter((h) => statsMap[h.id]?.startDate);

  return (
    <Box sx={{ px: 2, pt: "calc(env(safe-area-inset-top) + 16px)", pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      {habits.length > 1 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          {sortMode ? (
            <IconButton
              onClick={handleExitSort}
              aria-label={t("common.close")}
              sx={{ color: "primary.main", borderRadius: 2 }}
            >
              <SvgIcon aria-hidden="true"><path d={CHECK_PATH} /></SvgIcon>
            </IconButton>
          ) : (
            <Box
              component="button"
              onClick={() => { setSortMode(true); }}
              aria-label={t("habits.reorderBtn")}
              sx={{
                display: "flex", alignItems: "center", gap: 1,
                border: "none", background: "none", cursor: "pointer",
                color: "text.secondary", p: 1, borderRadius: 2,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <SvgIcon fontSize="small" aria-hidden="true" sx={{ flexShrink: 0 }}>
                <path d={SORT_PATH} />
              </SvgIcon>
              <Typography
                variant="caption"
                sx={{ textAlign: "left", whiteSpace: "pre-line", lineHeight: 1.3 }}
              >
                {t("habits.reorderBtn")}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      {habits.length === 0 && !habitsLoading && <EmptyState emoji="🌱" message={t("habits.empty")} />}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <SortableList
          items={sortableHabits}
          active={sortMode}
          onReorder={(ids) => { reorderHabits(ids); }}
          renderItem={(h, handleProps) => {
            const stats = statsMap[h.id];
            if (!stats) return null;
            return (
              <HabitCard
                habit={h}
                stats={stats}
                grade={getGrade(stats.currentStreak)}
                nextGrade={getNextGrade(stats.currentStreak)}
                onClick={() => { if (!sortMode) setDetailHabit({ habit: h, stats }); }}
                onDelete={() => { setDeleteTarget(h); }}
                handleProps={handleProps}
              />
            );
          }}
        />
      </Box>
      <HabitForm existingHabits={habits} onSubmit={(data) => {
        void addHabitWithInitialLog({ ...data, createdAt: new Date().toISOString() })
          .then(async () => {
            void loadHabits();
            toast.success(t("common.created"));
            const granted = await getPermissionStatus();
            if (granted === false) setShowNotifPrompt(true);
          })
          .catch((e: unknown) => { logError("Home.addHabit", e); toast.error(t("common.error")); });
      }} />

      {detailHabit && (
        <HabitDetailModal
          habit={detailHabit.habit}
          stats={detailHabit.stats}
          userName={userName}
          onClose={() => { setDetailHabit(null); }}
          onRelapse={(date) => { handleRelapse(detailHabit.habit, date); }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("habits.deleteConfirm")}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => { setDeleteTarget(null); }}
      />

      <ConfirmDialog
        open={showNotifPrompt}
        title={t("habits.notifPrompt.title")}
        body={t("habits.notifPrompt.body")}
        confirmLabel={t("habits.notifPrompt.confirm")}
        confirmColor="primary"
        cancelLabel={t("habits.notifPrompt.skip")}
        onConfirm={() => {
          setShowNotifPrompt(false);
          void requestPermission().then(async (granted) => {
            if (granted) {
              void rescheduleAllMilestoneNotifications();
              const exactOk = await getExactAlarmStatus();
              if (!exactOk) void openExactAlarmSettings();
            }
          });
        }}
        onCancel={() => { setShowNotifPrompt(false); }}
      />
    </Box>
  );
}
