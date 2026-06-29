import {
  getAllHabits,
  getAllHabitLogs,
  getAllTreatments,
  getAllTreatmentLogs,
  createHabit,
  createHabitLog,
  createTreatment,
  createTreatmentLog,
} from "@/db";
import {
  buildExportPayload,
  parseExportPayload,
  payloadToCSV,
  parseCSVPayload,
  exportTimestamp,
} from "../utils/exportSerialization";
import { shareFile } from "./shareService";

export async function exportToJSON(): Promise<boolean> {
  const [habits, habitLogs, treatments, treatmentLogs] = await Promise.all([
    getAllHabits(),
    getAllHabitLogs(),
    getAllTreatments(),
    getAllTreatmentLogs(),
  ]);

  const now = new Date().toISOString();
  const payload = buildExportPayload(habits, habitLogs, treatments, treatmentLogs, now);

  return shareFile(
    `esperanzapp_export_${exportTimestamp()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

export async function exportToCSV(): Promise<boolean> {
  const [habits, habitLogs, treatments, treatmentLogs] = await Promise.all([
    getAllHabits(),
    getAllHabitLogs(),
    getAllTreatments(),
    getAllTreatmentLogs(),
  ]);

  const now = new Date().toISOString();
  const payload = buildExportPayload(habits, habitLogs, treatments, treatmentLogs, now);

  return shareFile(
    `esperanzapp_export_${exportTimestamp()}.csv`,
    payloadToCSV(payload),
    "text/csv",
  );
}

export async function importFromJSON(file: File): Promise<void> {
  const raw = await file.text();
  const payload = parseExportPayload(raw);

  const habitIdMap = new Map<string, string>();
  for (const { id: oldId, ...data } of payload.habits) {
    const created = await createHabit(data);
    habitIdMap.set(oldId, created.id);
  }

  for (const { id: _id, habitId, ...data } of payload.habitLogs) {
    const newHabitId = habitIdMap.get(habitId);
    if (!newHabitId) continue;
    await createHabitLog({ ...data, habitId: newHabitId });
  }

  const treatmentIdMap = new Map<string, string>();
  for (const { id: oldId, ...data } of payload.treatments) {
    const created = await createTreatment(data);
    treatmentIdMap.set(oldId, created.id);
  }

  for (const { id: _id, treatmentId, ...data } of payload.treatmentLogs) {
    const newTreatmentId = treatmentIdMap.get(treatmentId);
    if (!newTreatmentId) continue;
    await createTreatmentLog({ ...data, treatmentId: newTreatmentId });
  }
}

export async function importFromCSV(file: File): Promise<void> {
  const raw = await file.text();
  const payload = parseCSVPayload(raw);

  const habitIdMap = new Map<string, string>();
  for (const { id: oldId, ...data } of payload.habits) {
    const created = await createHabit(data);
    habitIdMap.set(oldId, created.id);
  }

  for (const { id: _id, habitId, ...data } of payload.habitLogs) {
    const newHabitId = habitIdMap.get(habitId);
    if (!newHabitId) continue;
    await createHabitLog({ ...data, habitId: newHabitId });
  }

  const treatmentIdMap = new Map<string, string>();
  for (const { id: oldId, ...data } of payload.treatments) {
    const created = await createTreatment(data);
    treatmentIdMap.set(oldId, created.id);
  }

  for (const { id: _id, treatmentId, ...data } of payload.treatmentLogs) {
    const newTreatmentId = treatmentIdMap.get(treatmentId);
    if (!newTreatmentId) continue;
    await createTreatmentLog({ ...data, treatmentId: newTreatmentId });
  }
}
