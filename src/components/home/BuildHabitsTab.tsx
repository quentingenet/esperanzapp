import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse } from "date-fns";
import { todayLocalDate } from "@/utils";
import { useTranslation } from "react-i18next";
import { PositiveHabitCard, PositiveHabitForm } from "@/components/positiveHabits";
import {
  ConfirmDialog,
  EmptyState,
  OccurrenceCalendar,
  ReminderFields,
  SortableList,
} from "@/components/shared";
import {
  usePositiveHabits,
  usePositiveHabitLogs,
  useNotifications,
  useCalendar,
  useDateLocale,
} from "@/hooks";
import { toast } from "@/store/toastStore";
import { usePendingDeepLinkStore } from "@/store/pendingDeepLinkStore";
import { logError } from "@/utils/logger";
import { checkAndNotifyPositiveMilestone } from "@/utils/buildMilestoneNotifications";
import type { PositiveHabit, PositiveHabitLog, TreatmentStatus } from "@/types";

import { SORT_PATH, CHECK_PATH } from "@/utils/svgPaths";

export function BuildHabitsTab() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const {
    positiveHabits,
    loading: positiveHabitsLoading,
    error: positiveHabitsError,
    loadPositiveHabits,
    addPositiveHabit,
    editPositiveHabit,
    deletePositiveHabit,
    reorderPositiveHabits,
    savePositiveHabitsOrder,
  } = usePositiveHabits();
  const { logStatusForDate, getLogsByDate, getTakenCount } = usePositiveHabitLogs();
  const { getPositiveHabitStatusMap } = useCalendar();
  const { scheduleReminder, cancelReminder, requestPermission, openExactAlarmSettings } =
    useNotifications();
  const mountedRef = useRef(true);
  const isSavingOrderRef = useRef(false);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const [logsMap, setLogsMap] = useState<Record<string, PositiveHabitLog | null>>({});
  const [today, setToday] = useState(todayLocalDate);
  // Reactive rather than a one-shot lazy initializer: BuildHabitsTab may already be mounted
  // (e.g. the user is already on this sub-tab) when a notification tap requests a positive
  // habit, in which case there is no remount to consume the pending deep link at. Subscribing
  // to the queue picks it up whenever it arrives, opening that habit's expanded card.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pendingDeepLinkQueue = usePendingDeepLinkStore((s) => s.queue);
  useEffect(() => {
    if (!pendingDeepLinkQueue.some((l) => l.kind === "positiveHabit")) return;
    // Deferred to a microtask: react-hooks/set-state-in-effect forbids calling a React setState
    // synchronously in the body of an effect.
    void Promise.resolve().then(() => {
      const entityId = usePendingDeepLinkStore.getState().consumePending("positiveHabit");
      if (entityId) setSelectedId(entityId);
    });
  }, [pendingDeepLinkQueue]);
  const [deleteTarget, setDeleteTarget] = useState<PositiveHabit | null>(null);
  const [sortMode, setSortMode] = useState(false);
  const [editTarget, setEditTarget] = useState<PositiveHabit | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState<Date | null>(null);
  const [editReminderEnabled, setEditReminderEnabled] = useState(true);
  const [editReminderDay, setEditReminderDay] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadPositiveHabits();
  }, [loadPositiveHabits]);
  useEffect(() => {
    if (positiveHabitsError) toast.error(t("common.error"));
  }, [positiveHabitsError, t]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = tomorrow.getTime() - now.getTime() + 500;
    const timer = setTimeout(() => setToday(todayLocalDate()), ms);
    return () => clearTimeout(timer);
  }, [today]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getLogsByDate(today)
      .then((todayLogs) => {
        if (guard.cancelled) return;
        const map: Record<string, PositiveHabitLog | null> = Object.fromEntries(
          positiveHabits.map((h) => [h.id, null]),
        );
        for (const log of todayLogs) {
          map[log.positiveHabitId] = log;
        }
        setLogsMap(map);
      })
      .catch((e: unknown) => {
        logError("BuildHabitsTab.getLogsByDate", e);
      });
    return () => {
      guard.cancelled = true;
    };
  }, [positiveHabits, getLogsByDate, today]);

  const notifyIfMilestone = (positiveHabit: PositiveHabit, status: TreatmentStatus) => {
    if (status !== "taken") return;
    void getTakenCount(positiveHabit.id)
      .then((count) => checkAndNotifyPositiveMilestone(positiveHabit, count))
      .catch((e: unknown) => {
        logError("BuildHabitsTab.notifyIfMilestone", e);
      });
  };

  const handleLog = async (positiveHabit: PositiveHabit, status: TreatmentStatus) => {
    const today = todayLocalDate();
    try {
      const created = await logStatusForDate(positiveHabit.id, today, status);
      if (!mountedRef.current) return;
      setLogsMap((prev) => ({ ...prev, [positiveHabit.id]: created }));
      notifyIfMilestone(positiveHabit, status);
      if (positiveHabit.reminderEnabled) {
        void scheduleReminder(positiveHabit, "positiveHabits").catch((e: unknown) => {
          logError("BuildHabitsTab.scheduleReminderAfterLog", e);
        });
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deletePositiveHabit(target.id);
    } catch {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    void loadPositiveHabits();
    try {
      await cancelReminder(target.id, "positiveHabits");
    } catch (e) {
      logError("BuildHabitsTab.cancelReminderAfterDelete", e);
      // AppStartRescheduler will purge stale notifications at next app start.
    }
  };

  const openEdit = (h: PositiveHabit) => {
    setEditTarget(h);
    setEditLabel(h.label);
    setEditReminderEnabled(h.reminderEnabled);
    setEditReminderDay(h.reminderDay);
    setEditTime(parse(h.reminderTime, "HH:mm", new Date()));
  };

  const handleEditSave = () => {
    if (!editTarget || !editLabel.trim() || isSaving) return;
    if (editReminderEnabled && !editTime) return;
    if (editReminderEnabled && editTarget.frequency !== "daily" && editReminderDay === null) return;
    const reminderTime =
      editReminderEnabled && editTime ? format(editTime, "HH:mm") : editTarget.reminderTime;
    const reminderDay = editTarget.frequency === "daily" ? null : editReminderDay;
    const updatedFields = {
      label: editLabel.trim(),
      icon: editTarget.icon,
      color: editTarget.color,
      bgColor: editTarget.bgColor,
      reminderTime,
      reminderEnabled: editReminderEnabled,
      reminderDay,
    };
    setIsSaving(true);
    void editPositiveHabit(editTarget.id, updatedFields)
      .then(async () => {
        toast.success(t("common.saved"));
        void loadPositiveHabits();
        setEditTarget(null);
        try {
          if (editReminderEnabled) {
            if (Capacitor.isNativePlatform()) {
              const { display } = await LocalNotifications.checkPermissions().catch(() => ({
                display: "denied" as const,
              }));
              if (display === "prompt") {
                const granted = await requestPermission();
                if (!granted) {
                  toast.info(t("treatments.form.permissionDenied"));
                  return;
                }
              } else if (display === "denied") {
                toast.info(t("treatments.form.permissionDenied"));
                return;
              }
            }
            const status = await scheduleReminder(
              { ...editTarget, ...updatedFields },
              "positiveHabits",
            );
            if (status === "permission-denied") toast.info(t("treatments.form.permissionDenied"));
            else if (status === "exact-alarm-denied") {
              toast.info(t("treatments.reminderAlarmSettingsNeeded"));
              void openExactAlarmSettings();
            } else if (status === "schedule-failed")
              toast.info(t("positiveHabits.reminderSyncFailed"));
          } else {
            await cancelReminder(editTarget.id, "positiveHabits");
          }
        } catch (e) {
          logError("BuildHabitsTab.notificationAfterEdit", e);
          toast.info(t("positiveHabits.reminderSyncFailed"));
        }
      })
      .catch(() => {
        toast.error(t("common.error"));
      })
      .finally(() => {
        if (mountedRef.current) setIsSaving(false);
      });
  };

  const handleExitSort = useCallback(() => {
    if (isSavingOrderRef.current) return;
    isSavingOrderRef.current = true;
    setSortMode(false);
    void savePositiveHabitsOrder()
      .catch((e: unknown) => {
        logError("BuildHabitsTab.savePositiveHabitsOrder", e);
        toast.error(t("common.error"));
        void loadPositiveHabits();
      })
      .finally(() => {
        isSavingOrderRef.current = false;
      });
  }, [savePositiveHabitsOrder, t, loadPositiveHabits]);

  return (
    <Box sx={{ px: 2, pt: 1, pb: "calc(96px + max(env(safe-area-inset-bottom), 28px))" }}>
      {positiveHabits.length > 1 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          {sortMode ? (
            <IconButton
              onClick={handleExitSort}
              aria-label={t("common.close")}
              sx={{ color: "primary.main", borderRadius: 2 }}
            >
              <SvgIcon aria-hidden="true">
                <path d={CHECK_PATH} />
              </SvgIcon>
            </IconButton>
          ) : (
            <Box
              component="button"
              onClick={() => {
                setSortMode(true);
              }}
              aria-label={t("positiveHabits.reorderBtn")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "text.secondary",
                p: 1,
                borderRadius: 2,
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
                {t("positiveHabits.reorderBtn")}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      {positiveHabits.length === 0 && !positiveHabitsLoading && (
        <EmptyState emoji="🌻" message={t("positiveHabits.empty")} />
      )}
      <SortableList
        items={positiveHabits}
        active={sortMode}
        onReorder={(ids) => {
          reorderPositiveHabits(ids);
        }}
        renderItem={(h, handleProps) => (
          <Box>
            <PositiveHabitCard
              positiveHabit={h}
              todayLog={logsMap[h.id] ?? null}
              onLog={(status) => {
                void handleLog(h, status);
              }}
              onDelete={() => {
                setDeleteTarget(h);
              }}
              onEdit={() => {
                openEdit(h);
              }}
              isExpanded={selectedId === h.id}
              onToggle={() => {
                setSelectedId(h.id === selectedId ? null : h.id);
              }}
              handleProps={handleProps}
            />
            {selectedId === h.id && (
              <OccurrenceCalendar
                entityId={h.id}
                frequency={h.frequency}
                reminderDay={h.reminderDay}
                createdAt={h.createdAt}
                getStatusMap={getPositiveHabitStatusMap}
                namespace="positiveHabits"
                onLogDate={async (date, status) => {
                  try {
                    const log = await logStatusForDate(h.id, date, status);
                    if (date === today && mountedRef.current) {
                      setLogsMap((prev) => ({ ...prev, [h.id]: log }));
                    }
                    notifyIfMilestone(h, status);
                  } catch (e: unknown) {
                    logError("BuildHabitsTab.logStatusForDate", e);
                    throw e;
                  }
                }}
              />
            )}
          </Box>
        )}
      />
      <PositiveHabitForm
        isEmpty={positiveHabits.length === 0}
        existingPositiveHabits={positiveHabits}
        onSubmit={(data) => {
          void addPositiveHabit({ ...data, createdAt: new Date().toISOString() })
            .then(async (created) => {
              toast.success(t("common.created"));
              void loadPositiveHabits();
              if (created.reminderEnabled) {
                const status = await scheduleReminder(created, "positiveHabits");
                if (status === "permission-denied")
                  toast.info(t("treatments.form.permissionDenied"));
                else if (status === "exact-alarm-denied") {
                  toast.info(t("treatments.reminderAlarmSettingsNeeded"));
                  void openExactAlarmSettings();
                } else if (status === "schedule-failed")
                  toast.info(t("positiveHabits.reminderSyncFailed"));
              }
            })
            .catch(() => {
              toast.error(t("common.error"));
            });
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("positiveHabits.deleteConfirm")}
        onConfirm={() => {
          void handleDeleteConfirmed();
        }}
        onCancel={() => {
          setDeleteTarget(null);
        }}
      />

      <Drawer
        anchor="bottom"
        open={editTarget !== null}
        onClose={() => {
          setEditTarget(null);
        }}
        slotProps={{ paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "80dvh" } } }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
          <Box sx={{ px: 2, pt: 2, pb: "calc(24px + env(safe-area-inset-bottom))" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {t("positiveHabits.edit")}
            </Typography>
            <TextField
              fullWidth
              label={t("treatments.form.name")}
              value={editLabel}
              onChange={(e) => {
                setEditLabel(e.target.value);
              }}
              sx={{ mb: 2 }}
            />
            <ReminderFields
              frequency={editTarget?.frequency ?? "daily"}
              reminderEnabled={editReminderEnabled}
              onReminderEnabledChange={setEditReminderEnabled}
              time={editTime}
              onTimeChange={setEditTime}
              reminderDay={editReminderDay}
              onReminderDayChange={setEditReminderDay}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleEditSave}
              disabled={
                isSaving ||
                !editLabel.trim() ||
                (editReminderEnabled &&
                  (!editTime || (editTarget?.frequency !== "daily" && editReminderDay === null)))
              }
              aria-label={t("common.save")}
              sx={{ minHeight: 48, borderRadius: 2 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </LocalizationProvider>
      </Drawer>
    </Box>
  );
}
