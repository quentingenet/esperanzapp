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
  clearAllData,
} from "@/db";
import {
  buildExportPayload,
  parseExportPayload,
  payloadToCSV,
  parseCSVPayload,
  exportTimestamp,
  encryptPayload,
  decryptPayload,
  isEncryptedEnvelope,
  WrongPasswordError,
} from "../utils/exportSerialization";
import { shareFile, saveToFolder } from "./shareService";
import type { ShareOutcome, SaveOutcome } from "./shareService";

async function buildPayload() {
  const [habits, habitLogs, treatments, treatmentLogs] = await Promise.all([
    getAllHabits(),
    getAllHabitLogs(),
    getAllTreatments(),
    getAllTreatmentLogs(),
  ]);
  return buildExportPayload(habits, habitLogs, treatments, treatmentLogs, new Date().toISOString());
}

export async function exportToJSON(password?: string): Promise<ShareOutcome> {
  const payload = await buildPayload();
  const serialized = JSON.stringify(payload, null, 2);
  const content = password ? await encryptPayload(serialized, password, "json") : serialized;
  return shareFile(
    `esperanzapp_export_${exportTimestamp()}.json`,
    content,
    "application/json",
  );
}

export async function exportToCSV(password?: string): Promise<ShareOutcome> {
  const payload = await buildPayload();
  const csvContent = payloadToCSV(payload);
  if (password) {
    // Encrypted exports are always wrapped as JSON regardless of original format
    const content = await encryptPayload(csvContent, password, "csv");
    return shareFile(`esperanzapp_export_${exportTimestamp()}.json`, content, "application/json");
  }
  return shareFile(`esperanzapp_export_${exportTimestamp()}.csv`, csvContent, "text/csv");
}

export async function saveJSONToFolder(password?: string): Promise<SaveOutcome> {
  const payload = await buildPayload();
  const serialized = JSON.stringify(payload, null, 2);
  const content = password ? await encryptPayload(serialized, password, "json") : serialized;
  return saveToFolder(
    `esperanzapp_export_${exportTimestamp()}.json`,
    content,
    "application/json",
  );
}

export async function saveCSVToFolder(password?: string): Promise<SaveOutcome> {
  const payload = await buildPayload();
  const csvContent = payloadToCSV(payload);
  if (password) {
    const content = await encryptPayload(csvContent, password, "csv");
    return saveToFolder(`esperanzapp_export_${exportTimestamp()}.json`, content, "application/json");
  }
  return saveToFolder(`esperanzapp_export_${exportTimestamp()}.csv`, csvContent, "text/csv");
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
    await clearAllData(db);
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

async function resolveImportContent(
  raw: string,
  password: string | undefined,
): Promise<{ content: string; format: "json" | "csv" }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { content: raw, format: "csv" };
  }
  if (isEncryptedEnvelope(parsed)) {
    if (!password) throw new WrongPasswordError();
    return decryptPayload(raw, password);
  }
  return { content: raw, format: "json" };
}

export async function importFromJSON(file: File, password?: string): Promise<void> {
  const raw = await file.text();
  const { content, format } = await resolveImportContent(raw, password);
  const payload = format === "csv" ? parseCSVPayload(content) : parseExportPayload(content);
  await importPayload(payload);
}

export async function importFromCSV(file: File, password?: string): Promise<void> {
  const raw = await file.text();
  const { content, format } = await resolveImportContent(raw, password);
  const payload = format === "csv" ? parseCSVPayload(content) : parseExportPayload(content);
  await importPayload(payload);
}

export { WrongPasswordError };
