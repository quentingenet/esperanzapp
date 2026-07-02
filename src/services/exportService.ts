import {
  getAllHabits,
  getAllHabitLogs,
  getAllTreatments,
  getAllTreatmentLogs,
  createHabit,
  createHabitLog,
  createTreatment,
  createTreatmentLog,
  runInTransaction,
} from "@/db";
import {
  buildExportPayload,
  parseExportPayload,
  payloadToCSV,
  parseCSVPayload,
  exportTimestamp,
} from "../utils/exportSerialization";
import { shareFile, saveToFolder } from "./shareService";
import type { ShareOutcome, SaveOutcome } from "./shareService";

export async function exportToJSON(): Promise<ShareOutcome> {
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

export async function exportToCSV(): Promise<ShareOutcome> {
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

export async function saveJSONToFolder(): Promise<SaveOutcome> {
  const [habits, habitLogs, treatments, treatmentLogs] = await Promise.all([
    getAllHabits(),
    getAllHabitLogs(),
    getAllTreatments(),
    getAllTreatmentLogs(),
  ]);

  const now = new Date().toISOString();
  const payload = buildExportPayload(habits, habitLogs, treatments, treatmentLogs, now);

  return saveToFolder(
    `esperanzapp_export_${exportTimestamp()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

export async function saveCSVToFolder(): Promise<SaveOutcome> {
  const [habits, habitLogs, treatments, treatmentLogs] = await Promise.all([
    getAllHabits(),
    getAllHabitLogs(),
    getAllTreatments(),
    getAllTreatmentLogs(),
  ]);

  const now = new Date().toISOString();
  const payload = buildExportPayload(habits, habitLogs, treatments, treatmentLogs, now);

  return saveToFolder(
    `esperanzapp_export_${exportTimestamp()}.csv`,
    payloadToCSV(payload),
    "text/csv",
  );
}

function validateNoOrphans(payload: ReturnType<typeof parseExportPayload>): void {
  const habitIds = new Set(payload.habits.map((h) => h.id));
  for (const log of payload.habitLogs) {
    if (!habitIds.has(log.habitId))
      throw new Error(`import: habitLog "${log.id}" references unknown habitId "${log.habitId}"`);
  }
  const treatmentIds = new Set(payload.treatments.map((t) => t.id));
  for (const log of payload.treatmentLogs) {
    if (!treatmentIds.has(log.treatmentId))
      throw new Error(`import: treatmentLog "${log.id}" references unknown treatmentId "${log.treatmentId}"`);
  }
}

async function importPayload(payload: ReturnType<typeof parseExportPayload>): Promise<void> {
  validateNoOrphans(payload);
  await runInTransaction(async (db) => {
    const habitIdMap = new Map<string, string>();
    for (const { id: oldId, ...data } of payload.habits) {
      const created = await createHabit(data, db);
      habitIdMap.set(oldId, created.id);
    }
    for (const { id: _id, habitId, ...data } of payload.habitLogs) {
      const newHabitId = habitIdMap.get(habitId);
      if (!newHabitId) throw new Error(`import: unexpected missing mapping for habitId "${habitId}"`);
      await createHabitLog({ ...data, habitId: newHabitId }, db);
    }
    const treatmentIdMap = new Map<string, string>();
    for (const { id: oldId, ...data } of payload.treatments) {
      const created = await createTreatment(data, db);
      treatmentIdMap.set(oldId, created.id);
    }
    for (const { id: _id, treatmentId, ...data } of payload.treatmentLogs) {
      const newTreatmentId = treatmentIdMap.get(treatmentId);
      if (!newTreatmentId) throw new Error(`import: unexpected missing mapping for treatmentId "${treatmentId}"`);
      await createTreatmentLog({ ...data, treatmentId: newTreatmentId }, db);
    }
  });
}

export async function importFromJSON(file: File): Promise<void> {
  const payload = parseExportPayload(await file.text());
  await importPayload(payload);
}

export async function importFromCSV(file: File): Promise<void> {
  const payload = parseCSVPayload(await file.text());
  await importPayload(payload);
}
