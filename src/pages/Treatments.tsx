import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse } from "date-fns";
import { useTranslation } from "react-i18next";
import { TreatmentCard, TreatmentCalendar, TreatmentForm } from "@/components/treatments";
import { ConfirmDialog, EmptyState, PageHeader } from "@/components/shared";
import { useTreatments, useTreatmentLogs, useNotifications, useDateLocale } from "@/hooks";
import { toast } from "@/store/toastStore";
import type { Treatment, TreatmentLog, TreatmentStatus } from "@/types";

export function Treatments() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { treatments, loadTreatments, addTreatment, editTreatment, deleteTreatment } = useTreatments();
  const { logStatus, logStatusForDate, getLogsByTreatment } = useTreatmentLogs();
  const { scheduleReminder, cancelReminder } = useNotifications();
  const [logsMap, setLogsMap] = useState<Record<string, TreatmentLog | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [editTarget, setEditTarget] = useState<Treatment | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState<Date | null>(null);
  const [editReminderEnabled, setEditReminderEnabled] = useState(true);

  useEffect(() => { void loadTreatments(); }, [loadTreatments]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    async function loadLogs() {
      const map: Record<string, TreatmentLog | null> = {};
      for (const tr of treatments) {
        const logs = await getLogsByTreatment(tr.id);
        map[tr.id] = logs.find((l) => l.scheduledAt.slice(0, 10) === today) ?? null;
      }
      setLogsMap(map);
    }
    void loadLogs();
  }, [treatments, getLogsByTreatment]);

  const handleLog = async (treatment: Treatment, status: TreatmentStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    const created = await logStatus({ treatmentId: treatment.id, scheduledAt: today, status });
    setLogsMap((prev) => ({ ...prev, [treatment.id]: created }));
    if (treatment.reminderEnabled) void scheduleReminder(treatment, true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;
    void deleteTreatment(deleteTarget.id)
      .then(() => { toast.success(t("common.deleted")); void loadTreatments(); })
      .catch(() => { toast.error(t("common.error")); });
    setDeleteTarget(null);
  };

  const openEdit = (tr: Treatment) => {
    setEditTarget(tr);
    setEditLabel(tr.label);
    setEditReminderEnabled(tr.reminderEnabled);
    setEditTime(parse(tr.reminderTime, "HH:mm", new Date()));
  };

  const handleEditSave = () => {
    if (!editTarget || !editLabel.trim()) return;
    if (editReminderEnabled && !editTime) return;
    const reminderTime = editReminderEnabled && editTime ? format(editTime, "HH:mm") : editTarget.reminderTime;
    void editTreatment(editTarget.id, { label: editLabel.trim(), reminderTime, reminderEnabled: editReminderEnabled })
      .then(async () => {
        if (!editReminderEnabled) await cancelReminder(editTarget.id);
        toast.success(t("common.saved"));
        void loadTreatments();
        setEditTarget(null);
      })
      .catch(() => { toast.error(t("common.error")); });
  };

  return (
    <Box sx={{ pb: "calc(80px + env(safe-area-inset-bottom))" }}>
      <PageHeader title={t("treatments.title")} />
      <Box sx={{ px: 2, pt: 1 }}>
        {treatments.length === 0 && <EmptyState emoji="💊" message={t("treatments.empty")} />}
        {treatments.map((tr) => (
          <Box key={tr.id}>
            <Box onClick={() => { setSelectedId(tr.id === selectedId ? null : tr.id); }}>
              <TreatmentCard
                treatment={tr}
                todayLog={logsMap[tr.id] ?? null}
                onLog={(status) => { void handleLog(tr, status); }}
                onDelete={() => { setDeleteTarget(tr); }}
                onEdit={() => { openEdit(tr); }}
              />
            </Box>
            {selectedId === tr.id && (
              <TreatmentCalendar
                treatmentId={tr.id}
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
        onConfirm={handleDeleteConfirmed}
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
              control={
                <Switch
                  checked={editReminderEnabled}
                  onChange={(e) => { setEditReminderEnabled(e.target.checked); }}
                />
              }
              label={t("treatments.form.enableReminder")}
              sx={{ mb: 1 }}
            />
            {editReminderEnabled && (
              <TimePicker
                value={editTime}
                onChange={setEditTime}
                label={t("treatments.form.reminderTime")}
                sx={{ width: "100%", mb: 2 }}
              />
            )}
            <Button
              fullWidth
              variant="contained"
              onClick={handleEditSave}
              disabled={!editLabel.trim() || (editReminderEnabled && !editTime)}
              aria-label={t("common.save")}
              sx={{ minHeight: 48, borderRadius: 2, mt: editReminderEnabled ? 0 : 2 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </LocalizationProvider>
      </Drawer>
    </Box>
  );
}
