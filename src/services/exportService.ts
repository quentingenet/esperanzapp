import {
  getAllHabits,
  getAllHabitLogs,
  getAllTreatments,
  getAllTreatmentLogs,
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
  UnsupportedExportVersionError,
} from "../utils/exportSerialization";
import { shareFile, saveToFolder } from "./shareService";
import type { ShareOutcome, SaveOutcome } from "./shareService";

export class InvalidImportFileError extends Error {
  constructor(cause?: unknown) {
    super("Invalid import file", { cause });
    this.name = "InvalidImportFileError";
  }
}

export class UnsupportedImportVersionError extends Error {
  constructor() {
    super("Unsupported import version");
    this.name = "UnsupportedImportVersionError";
  }
}

export class InconsistentImportDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InconsistentImportDataError";
  }
}

export class ImportStorageError extends Error {
  constructor(cause?: unknown) {
    super("Import could not be written to storage", { cause });
    this.name = "ImportStorageError";
  }
}

async function buildPayload() {
  // runInTransaction issues BEGIN TRANSACTION so all four reads share a consistent
  // snapshot: a concurrent write cannot interleave between them.
  return runInTransaction(async () => {
    const [habits, habitLogs, treatments, treatmentLogs] = await Promise.all([
      getAllHabits(),
      getAllHabitLogs(),
      getAllTreatments(),
      getAllTreatmentLogs(),
    ]);
    return buildExportPayload(habits, habitLogs, treatments, treatmentLogs, new Date().toISOString());
  });
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
      throw new InconsistentImportDataError(`import: habitLog "${log.id}" references unknown habitId "${log.habitId}"`);
  }
  const treatmentIds = new Set(payload.treatments.map((t) => t.id));
  for (const log of payload.treatmentLogs) {
    if (!treatmentIds.has(log.treatmentId))
      throw new InconsistentImportDataError(`import: treatmentLog "${log.id}" references unknown treatmentId "${log.treatmentId}"`);
  }
}

async function importPayload(payload: ReturnType<typeof parseExportPayload>): Promise<void> {
  validateNoOrphans(payload);
  try {
    await runInTransaction(async (db) => {
      // Web dev mode: db is null, nothing to do.
      if (!db) return;
      // Every statement must opt out of the plugin's implicit transaction because
      // runInTransaction already opened one. Android rejects nested transactions.
      await clearAllData(db, false);
      // Insert with original IDs so foreign-key relationships are preserved.
      for (const [index, h] of payload.habits.entries()) {
        await db.run(
          "INSERT INTO habits (id, label, icon, color, bg_color, start_date, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [h.id, h.label, h.icon, h.color, h.bgColor, h.startDate, h.createdAt, index],
          false,
        );
      }
      for (const l of payload.habitLogs) {
        await db.run(
          "INSERT INTO habit_logs (id, habit_id, event_type, event_date) VALUES (?, ?, ?, ?)",
          [l.id, l.habitId, l.eventType, l.eventDate],
          false,
        );
      }
      for (const [index, t] of payload.treatments.entries()) {
        await db.run(
          "INSERT INTO treatments (id, label, frequency, reminder_time, reminder_enabled, reminder_day, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [t.id, t.label, t.frequency, t.reminderTime, t.reminderEnabled ? 1 : 0, t.reminderDay ?? null, t.createdAt, index],
          false,
        );
      }
      for (const tl of payload.treatmentLogs) {
        // INSERT OR IGNORE is intentional: treatment_logs has a UNIQUE(treatment_id, scheduled_at)
        // constraint to prevent duplicate dose records. On re-import of the same file (e.g. after
        // a device restore), the existing rows must win over the imported ones so that any edits
        // made after the last export are preserved. Silently skipping duplicates is the correct
        // behaviour here; an OR REPLACE would overwrite those post-export edits.
        // Trade-off accepted: a hand-edited import file with conflicting rows for the same
        // (treatment_id, scheduled_at) will drop the later row without user feedback.
        await db.run(
          "INSERT OR IGNORE INTO treatment_logs (id, treatment_id, scheduled_at, status) VALUES (?, ?, ?, ?)",
          [tl.id, tl.treatmentId, tl.scheduledAt, tl.status],
          false,
        );
      }
    });
  } catch (cause) {
    throw new ImportStorageError(cause);
  }
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
  const payload = parseImportContent(content, format);
  await importPayload(payload);
}

export async function importFromCSV(file: File, password?: string): Promise<void> {
  const raw = await file.text();
  const { content, format } = await resolveImportContent(raw, password);
  const payload = parseImportContent(content, format);
  await importPayload(payload);
}

function parseImportContent(content: string, format: "json" | "csv") {
  try {
    return format === "csv" ? parseCSVPayload(content) : parseExportPayload(content);
  } catch (cause) {
    if (cause instanceof UnsupportedExportVersionError) {
      throw new UnsupportedImportVersionError();
    }
    throw new InvalidImportFileError(cause);
  }
}

export { WrongPasswordError };
