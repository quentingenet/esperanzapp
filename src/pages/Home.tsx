import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { HabitCard, HabitDetailModal, HabitForm } from "@/components/habits";
import { ConfirmDialog, EmptyState } from "@/components/shared";
import { useHabits, useHabitLogs } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { toast } from "@/store/toastStore";
import { getGrade, getNextGrade } from "@/utils/grades";
import type { Habit, HabitStats } from "@/types";

export function Home() {
  const { t } = useTranslation();
  const { habits, loadHabits, addHabit, deleteHabit } = useHabits();
  const { getStats, addLog } = useHabitLogs();
  const userName = useOnboardingStore((s) => s.userName);
  const [statsMap, setStatsMap] = useState<Partial<Record<string, HabitStats>>>({});
  const [detailHabit, setDetailHabit] = useState<{ habit: Habit; stats: HabitStats } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  useEffect(() => { void loadHabits(); }, [loadHabits]);

  useEffect(() => {
    async function load() {
      const map: Record<string, HabitStats> = {};
      for (const h of habits) { map[h.id] = await getStats(h.id); }
      setStatsMap(map);
    }
    void load();
  }, [habits, getStats]);

  const handleRelapse = (habit: Habit) => {
    const today = new Date().toISOString().slice(0, 10);
    void addLog({ habitId: habit.id, eventType: "relapse", eventDate: today })
      .then(() => addLog({ habitId: habit.id, eventType: "start", eventDate: today }))
      .then(() => { void loadHabits(); setDetailHabit(null); });
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;
    void deleteHabit(deleteTarget.id)
      .then(() => { toast.success(t("common.deleted")); void loadHabits(); })
      .catch(() => { toast.error(t("common.error")); });
    setDeleteTarget(null);
  };

  return (
    <Box sx={{ px: 2, pt: "calc(env(safe-area-inset-top) + 16px)", pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      {habits.length === 0 && <EmptyState emoji="🌱" message={t("habits.empty")} />}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {habits.map((h) => {
          const stats = statsMap[h.id];
          if (!stats) return null;
          return (
            <HabitCard key={h.id} habit={h} stats={stats}
              grade={getGrade(stats.currentStreak)}
              nextGrade={getNextGrade(stats.currentStreak)}
              onClick={() => { setDetailHabit({ habit: h, stats }); }}
              onDelete={() => { setDeleteTarget(h); }}
            />
          );
        })}
      </Box>
      <HabitForm existingHabits={habits} onSubmit={(data) => {
        void addHabit({ ...data, createdAt: new Date().toISOString() })
          .then((created) => addLog({ habitId: created.id, eventType: "start", eventDate: data.startDate }))
          .then(() => { void loadHabits(); toast.success(t("common.created")); })
          .catch(() => { toast.error(t("common.error")); });
      }} />

      {detailHabit && (
        <HabitDetailModal
          habit={detailHabit.habit}
          stats={detailHabit.stats}
          userName={userName}
          onClose={() => { setDetailHabit(null); }}
          onRelapse={() => { handleRelapse(detailHabit.habit); }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("habits.deleteConfirm")}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => { setDeleteTarget(null); }}
      />
    </Box>
  );
}
