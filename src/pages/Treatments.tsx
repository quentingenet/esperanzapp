import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
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
import { weekDayLabel } from "@/components/treatments/treatmentUtils";
import { ConfirmDialog, EmptyState, PageHeader } from "@/components/shared";
import { useTreatments, useTreatmentLogs, useNotifications, useDateLocale } from "@/hooks";
import { toast } from "@/store/toastStore";
import type { Treatment, TreatmentLog, TreatmentStatus } from "@/types";

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];
const MONTH_DAYS = [
  { value: 1, key: "firstDay" },
  ...Array.from({ length: 27 }, (_, i) => ({ value: i + 2, key: String(i + 2) })),
  { value: 0, key: "lastDay" },
];

export function Treatments() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { treatments, loadTreatments, addTreatment, editTreatment, deleteTreatment } = useTreatments();
  const { logStatus, logStatusForDate, getLogsByDate } = useTreatmentLogs();
  const { scheduleReminder, cancelReminder } = useNotifications();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [logsMap, setLogsMap] = useState<Record<string, TreatmentLog | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [editTarget, setEditTarget] = useState<Treatment | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState<Date | null>(null);
  const [editReminderEnabled, setEditReminderEnabled] = useState(true);
  const [editReminderDay, setEditReminderDay] = useState<number | null>(null);

  useEffect(() => { void loadTreatments(); }, [loadTreatments]);

  useEffect(() => {
    const guard = { cancelled: false };
    const today = todayLocalDate();
    void getLogsByDate(today).then((todayLogs) => {
      if (guard.cancelled) return;
      const map: Record<string, TreatmentLog | null> = Object.fromEntries(
        treatments.map((tr) => [tr.id, null]),
      );
      for (const log of todayLogs) { map[log.treatmentId] = log; }
      setLogsMap(map);
    });
    return () => { guard.cancelled = true; };
  }, [treatments, getLogsByDate]);

  const handleLog = async (treatment: Treatment, status: TreatmentStatus) => {
    const today = todayLocalDate();
    try {
      const created = await logStatus({ treatmentId: treatment.id, scheduledAt: today, status });
      if (!mountedRef.current) return;
      setLogsMap((prev) => ({ ...prev, [treatment.id]: created }));
      if (treatment.reminderEnabled) void scheduleReminder(treatment, true);
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
      await cancelReminder(target.id);
      toast.success(t("common.deleted"));
      void loadTreatments();
    } catch {
      toast.error(t("common.error"));
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
    if (!editTarget || !editLabel.trim()) return;
    if (editReminderEnabled && !editTime) return;
    if (editReminderEnabled && editTarget.frequency !== "daily" && editReminderDay === null) return;
    const reminderTime = editReminderEnabled && editTime ? format(editTime, "HH:mm") : editTarget.reminderTime;
    const reminderDay = editReminderEnabled ? editReminderDay : null;
    const updatedFields = { label: editLabel.trim(), reminderTime, reminderEnabled: editReminderEnabled, reminderDay };
    void editTreatment(editTarget.id, updatedFields)
      .then(async () => {
        const updatedTreatment = { ...editTarget, ...updatedFields };
        if (editReminderEnabled) {
          const status = await scheduleReminder(updatedTreatment);
          if (status === "permission-denied") toast.info(t("treatments.form.permissionDenied"));
        } else {
          await cancelReminder(editTarget.id);
        }
        toast.success(t("common.saved"));
        void loadTreatments();
        setEditTarget(null);
      })
      .catch(() => { toast.error(t("common.error")); });
  };

  const showEditDaySelect = editReminderEnabled && editTarget !== null && editTarget.frequency !== "daily";

  return (
    <Box sx={{ pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      <PageHeader title={t("treatments.title")} />
      <Box sx={{ px: 2, pt: 1 }}>
        {treatments.length === 0 && <EmptyState emoji="💊" message={t("treatments.empty")} />}
        {treatments.map((tr) => (
          <Box key={tr.id}>
            <TreatmentCard
              treatment={tr}
              todayLog={logsMap[tr.id] ?? null}
              onLog={(status) => { void handleLog(tr, status); }}
              onDelete={() => { setDeleteTarget(tr); }}
              onEdit={() => { openEdit(tr); }}
              isExpanded={selectedId === tr.id}
              onToggle={() => { setSelectedId(tr.id === selectedId ? null : tr.id); }}
            />
            {selectedId === tr.id && (
              <TreatmentCalendar
                treatmentId={tr.id}
                frequency={tr.frequency}
                reminderDay={tr.reminderDay}
                createdAt={tr.createdAt}
                onLogDate={(date, status) => logStatusForDate(tr.id, date, status)}
              />
            )}
          </Box>
        ))}
        <TreatmentForm onSubmit={(data) => {
          void addTreatment({ ...data, createdAt: new Date().toISOString() })
            .then((created) => {
              if (created.reminderEnabled) void scheduleReminder(created);
              void loadTreatments();
              toast.success(t("common.created"));
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
              disabled={!editLabel.trim() || (editReminderEnabled && (!editTime || (editTarget?.frequency !== "daily" && editReminderDay === null)))}
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
