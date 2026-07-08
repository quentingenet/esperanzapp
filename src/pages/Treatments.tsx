import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse } from "date-fns";
import { todayLocalDate } from "@/utils";
import { useTranslation } from "react-i18next";
import { TreatmentCard, TreatmentCalendar, TreatmentForm } from "@/components/treatments";
import { weekDayLabel, WEEK_DAYS, MONTH_DAYS } from "@/components/treatments/treatmentUtils";
import { ConfirmDialog, EmptyState, PageHeader, SortableList } from "@/components/shared";
import { useTreatments, useTreatmentLogs, useNotifications, useDateLocale } from "@/hooks";
import { toast } from "@/store/toastStore";
import { logError } from "@/utils/logger";
import type { Treatment, TreatmentLog, TreatmentStatus } from "@/types";

import { SORT_PATH, CHECK_PATH } from "@/utils/svgPaths";

export function Treatments() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { treatments, loading: treatmentsLoading, error: treatmentsError, loadTreatments, addTreatment, editTreatment, deleteTreatment, reorderTreatments, saveTreatmentsOrder } = useTreatments();
  const { logStatus, logStatusForDate, getLogsByDate } = useTreatmentLogs();
  const { scheduleReminder, cancelReminder, requestPermission, openExactAlarmSettings } = useNotifications();
  const mountedRef = useRef(true);
  const isSavingOrderRef = useRef(false);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [logsMap, setLogsMap] = useState<Record<string, TreatmentLog | null>>({});
  const [today, setToday] = useState(todayLocalDate);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [sortMode, setSortMode] = useState(false);
  const [editTarget, setEditTarget] = useState<Treatment | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState<Date | null>(null);
  const [editReminderEnabled, setEditReminderEnabled] = useState(true);
  const [editReminderDay, setEditReminderDay] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { void loadTreatments(); }, [loadTreatments]);
  useEffect(() => { if (treatmentsError) toast.error(t("common.error")); }, [treatmentsError, t]);

  // Refresh today at midnight so the display stays in sync if the app stays open overnight.
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = tomorrow.getTime() - now.getTime() + 500;
    const timer = setTimeout(() => setToday(todayLocalDate()), ms);
    return () => clearTimeout(timer);
  }, [today]);

  useEffect(() => {
    const guard = { cancelled: false };
    void getLogsByDate(today).then((todayLogs) => {
      if (guard.cancelled) return;
      const map: Record<string, TreatmentLog | null> = Object.fromEntries(
        treatments.map((tr) => [tr.id, null]),
      );
      for (const log of todayLogs) { map[log.treatmentId] = log; }
      setLogsMap(map);
    }).catch((e: unknown) => { logError("Treatments.getLogsByDate", e); });
    return () => { guard.cancelled = true; };
  }, [treatments, getLogsByDate, today]);

  const handleLog = async (treatment: Treatment, status: TreatmentStatus) => {
    const today = todayLocalDate();
    try {
      const created = await logStatus({ treatmentId: treatment.id, scheduledAt: today, status });
      if (!mountedRef.current) return;
      setLogsMap((prev) => ({ ...prev, [treatment.id]: created }));
      if (treatment.reminderEnabled) {
        void scheduleReminder(treatment).catch((e: unknown) => {
          logError("Treatments.scheduleReminderAfterLog", e);
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
      await deleteTreatment(target.id);
    } catch {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    void loadTreatments();
    try {
      await cancelReminder(target.id);
    } catch (e) {
      logError("Treatments.cancelReminderAfterDelete", e);
      // AppStartRescheduler will purge stale notifications at next app start.
    }
  };

  const openEdit = (tr: Treatment) => {
    setEditTarget(tr);
    setEditLabel(tr.label);
    setEditReminderEnabled(tr.reminderEnabled);
    setEditReminderDay(tr.reminderDay);
    setEditTime(parse(tr.reminderTime, "HH:mm", new Date()));
  };

  const handleEditSave = () => {
    if (!editTarget || !editLabel.trim() || isSaving) return;
    if (editReminderEnabled && !editTime) return;
    if (editReminderEnabled && editTarget.frequency !== "daily" && editReminderDay === null) return;
    const reminderTime = editReminderEnabled && editTime ? format(editTime, "HH:mm") : editTarget.reminderTime;
    const reminderDay = editTarget.frequency === "daily" ? null : editReminderDay;
    const updatedFields = { label: editLabel.trim(), reminderTime, reminderEnabled: editReminderEnabled, reminderDay };
    setIsSaving(true);
    void editTreatment(editTarget.id, updatedFields)
      .then(async () => {
        toast.success(t("common.saved"));
        void loadTreatments();
        setEditTarget(null);
        try {
          if (editReminderEnabled) {
            if (Capacitor.isNativePlatform()) {
              const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
              if (display === "prompt") {
                const granted = await requestPermission();
                if (!granted) { toast.info(t("treatments.form.permissionDenied")); return; }
              } else if (display === "denied") {
                toast.info(t("treatments.form.permissionDenied")); return;
              }
            }
            const status = await scheduleReminder({ ...editTarget, ...updatedFields });
            if (status === "permission-denied") toast.info(t("treatments.form.permissionDenied"));
            else if (status === "exact-alarm-denied") { toast.info(t("treatments.reminderAlarmSettingsNeeded")); void openExactAlarmSettings(); }
            else if (status === "schedule-failed") toast.info(t("treatments.reminderSyncFailed"));
          } else {
            await cancelReminder(editTarget.id);
          }
        } catch (e) {
          logError("Treatments.notificationAfterEdit", e);
          toast.info(t("treatments.reminderSyncFailed"));
        }
      })
      .catch(() => { toast.error(t("common.error")); })
      .finally(() => { if (mountedRef.current) setIsSaving(false); });
  };

  const showEditDaySelect = editReminderEnabled && editTarget !== null && editTarget.frequency !== "daily";

  const handleExitSort = useCallback(() => {
    if (isSavingOrderRef.current) return;
    isSavingOrderRef.current = true;
    setSortMode(false);
    void saveTreatmentsOrder()
      .catch((e: unknown) => {
        logError("Treatments.saveTreatmentsOrder", e);
        toast.error(t("common.error"));
        void loadTreatments();
      })
      .finally(() => { isSavingOrderRef.current = false; });
  }, [saveTreatmentsOrder, t, loadTreatments]);

  return (
    <Box sx={{ pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      <PageHeader title={t("treatments.title")} />
      <Box sx={{ px: 2, pt: 1 }}>
        {treatments.length > 1 && (
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
                aria-label={t("treatments.reorderBtn")}
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
                  {t("treatments.reorderBtn")}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        {treatments.length === 0 && !treatmentsLoading && <EmptyState emoji="💊" message={t("treatments.empty")} />}
        <SortableList
          items={treatments}
          active={sortMode}
          onReorder={(ids) => { reorderTreatments(ids); }}
          renderItem={(tr, handleProps) => (
            <Box>
              <TreatmentCard
                treatment={tr}
                todayLog={logsMap[tr.id] ?? null}
                onLog={(status) => { void handleLog(tr, status); }}
                onDelete={() => { setDeleteTarget(tr); }}
                onEdit={() => { openEdit(tr); }}
                isExpanded={selectedId === tr.id}
                onToggle={() => { setSelectedId(tr.id === selectedId ? null : tr.id); }}
                handleProps={handleProps}
              />
              {selectedId === tr.id && (
                <TreatmentCalendar
                  treatmentId={tr.id}
                  frequency={tr.frequency}
                  reminderDay={tr.reminderDay}
                  createdAt={tr.createdAt}
                  onLogDate={async (date, status) => {
                    try {
                      const log = await logStatusForDate(tr.id, date, status);
                      if (date === today && mountedRef.current) {
                        setLogsMap((prev) => ({ ...prev, [tr.id]: log }));
                      }
                    } catch (e: unknown) {
                      logError("Treatments.logStatusForDate", e);
                      throw e;
                    }
                  }}
                />
              )}
            </Box>
          )}
        />
        <TreatmentForm onSubmit={(data) => {
          void addTreatment({ ...data, createdAt: new Date().toISOString() })
            .then(async (created) => {
              toast.success(t("common.created"));
              void loadTreatments();
              if (created.reminderEnabled) {
                const status = await scheduleReminder(created);
                if (status === "permission-denied") toast.info(t("treatments.form.permissionDenied"));
                else if (status === "exact-alarm-denied") { toast.info(t("treatments.reminderAlarmSettingsNeeded")); void openExactAlarmSettings(); }
            else if (status === "schedule-failed") toast.info(t("treatments.reminderSyncFailed"));
              }
            })
            .catch(() => { toast.error(t("common.error")); });
        }} />
      </Box>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("treatments.deleteConfirm")}
        onConfirm={() => { void handleDeleteConfirmed(); }}
        onCancel={() => { setDeleteTarget(null); }}
      />

      <Drawer
        anchor="bottom"
        open={editTarget !== null}
        onClose={() => { setEditTarget(null); }}
        slotProps={{ paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "80dvh" } } }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
          <Box sx={{ px: 2, pt: 2, pb: "calc(24px + env(safe-area-inset-bottom))" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t("treatments.edit")}</Typography>
            <TextField
              fullWidth
              label={t("treatments.form.name")}
              value={editLabel}
              onChange={(e) => { setEditLabel(e.target.value); }}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={<Switch checked={editReminderEnabled} onChange={(e) => { setEditReminderEnabled(e.target.checked); }} />}
              label={t("treatments.form.enableReminder")}
              sx={{ mb: 1 }}
            />
            {editReminderEnabled && (
              <TimePicker value={editTime} onChange={setEditTime} label={t("treatments.form.reminderTime")} sx={{ width: "100%", mb: 2 }} />
            )}
            {showEditDaySelect && (
              <Select
                fullWidth
                value={editReminderDay ?? ""}
                onChange={(e) => { setEditReminderDay(e.target.value); }}
                sx={{ mb: 2 }}
                displayEmpty
                MenuProps={{ slotProps: { paper: { sx: { maxHeight: "50vh", pb: "env(safe-area-inset-bottom)" } } } }}
              >
                <MenuItem value="" disabled>{t("treatments.form.reminderDay")}</MenuItem>
                {editTarget.frequency === "weekly"
                  ? WEEK_DAYS.map((d) => <MenuItem key={d} value={d}>{weekDayLabel(d, dateLocale)}</MenuItem>)
                  : MONTH_DAYS.map((d) => (
                      <MenuItem key={d.key} value={d.value}>
                        {d.key === "firstDay" ? t("treatments.form.firstDay")
                          : d.key === "lastDay" ? t("treatments.form.lastDay")
                          : t("treatments.form.dayOfMonth", { day: d.value })}
                      </MenuItem>
                    ))
                }
              </Select>
            )}
            <Button
              fullWidth
              variant="contained"
              onClick={handleEditSave}
              disabled={isSaving || !editLabel.trim() || (editReminderEnabled && (!editTime || (editTarget?.frequency !== "daily" && editReminderDay === null)))}
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
