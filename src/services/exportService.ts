import {
  getAllHabits,
  getAllHabitLogs,
  getAllTreatments,
  getAllTreatmentLogs,
  getAllPositiveHabits,
  getAllPositiveHabitLogs,
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
  CorruptFileError,
  UnsupportedExportVersionError,
} from "../utils/exportSerialization";
import { shareFile, saveToFolder } from "./shareService";
import type { ShareOutcome, SaveOutcome } from "./shareService";
import { POSITIVE_GRADES } from "@/utils/positiveGrades";

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
  // runInTransaction issues BEGIN TRANSACTION so all six reads share a consistent
  // snapshot: a concurrent write cannot interleave between them.
  // Reads are sequential, not Promise.all: all six ultimately call db.query() on the same
  // single SQLiteDBConnection, and firing them concurrently against one native bridge
  // connection is unverified territory - sequential awaits cost nothing measurable for a
  // local export and remove any doubt about interleaved native calls.
  return runInTransaction(async () => {
    const habits = await getAllHabits();
    const habitLogs = await getAllHabitLogs();
    const treatments = await getAllTreatments();
    const treatmentLogs = await getAllTreatmentLogs();
    const positiveHabits = await getAllPositiveHabits();
    const positiveHabitLogs = await getAllPositiveHabitLogs();
    return buildExportPayload(
      habits,
      habitLogs,
      treatments,
      treatmentLogs,
      new Date().toISOString(),
      positiveHabits,
      positiveHabitLogs,
    );
  });
}

export async function exportToJSON(password?: string): Promise<ShareOutcome> {
  const payload = await buildPayload();
  const serialized = JSON.stringify(payload, null, 2);
  const content = password ? await encryptPayload(serialized, password, "json") : serialized;
  return shareFile(`esperanzapp_export_${exportTimestamp()}.json`, content, "application/json");
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
  return saveToFolder(`esperanzapp_export_${exportTimestamp()}.json`, content, "application/json");
}

export async function saveCSVToFolder(password?: string): Promise<SaveOutcome> {
  const payload = await buildPayload();
  const csvContent = payloadToCSV(payload);
  if (password) {
    const content = await encryptPayload(csvContent, password, "csv");
    return saveToFolder(
      `esperanzapp_export_${exportTimestamp()}.json`,
      content,
      "application/json",
    );
  }
  return saveToFolder(`esperanzapp_export_${exportTimestamp()}.csv`, csvContent, "text/csv");
}

function validateNoOrphans(payload: ReturnType<typeof parseExportPayload>): void {
  const habitIds = new Set(payload.habits.map((h) => h.id));
  if (habitIds.size !== payload.habits.length)
    throw new InconsistentImportDataError("import: duplicate habit IDs detected");
  const habitLogIds = new Set<string>();
  for (const log of payload.habitLogs) {
    if (habitLogIds.has(log.id))
      throw new InconsistentImportDataError(`import: duplicate habitLog ID "${log.id}" detected`);
    habitLogIds.add(log.id);
    if (!habitIds.has(log.habitId))
      throw new InconsistentImportDataError(
        `import: habitLog "${log.id}" references unknown habitId "${log.habitId}"`,
      );
  }
  // Note: we verify that a start log exists but not that starts and relapses alternate strictly.
  // Two consecutive starts without a relapse between them are accepted here; computeStats()
  // handles them gracefully (first start wins for streak) and this state is unreachable
  // through the app's own UI (recordHabitRelapse always inserts relapse+start atomically).
  for (const habitId of habitIds) {
    if (!payload.habitLogs.some((l) => l.habitId === habitId && l.eventType === "start"))
      throw new InconsistentImportDataError(`import: habit "${habitId}" has no start log`);
  }
  const treatmentIds = new Set(payload.treatments.map((t) => t.id));
  if (treatmentIds.size !== payload.treatments.length)
    throw new InconsistentImportDataError("import: duplicate treatment IDs detected");
  const treatmentLogIds = new Set<string>();
  const treatmentLogKeys = new Set<string>();
  for (const log of payload.treatmentLogs) {
    if (treatmentLogIds.has(log.id))
      throw new InconsistentImportDataError(
        `import: duplicate treatmentLog ID "${log.id}" detected`,
      );
    treatmentLogIds.add(log.id);
    if (!treatmentIds.has(log.treatmentId))
      throw new InconsistentImportDataError(
        `import: treatmentLog "${log.id}" references unknown treatmentId "${log.treatmentId}"`,
      );
    const key = `${log.treatmentId}:${log.scheduledAt}`;
    if (treatmentLogKeys.has(key))
      throw new InconsistentImportDataError(
        `import: duplicate treatment log for treatmentId "${log.treatmentId}" on "${log.scheduledAt}"`,
      );
    treatmentLogKeys.add(key);
  }
  const positiveHabitIds = new Set(payload.positiveHabits.map((h) => h.id));
  if (positiveHabitIds.size !== payload.positiveHabits.length)
    throw new InconsistentImportDataError("import: duplicate positive habit IDs detected");
  const positiveHabitLogIds = new Set<string>();
  const positiveHabitLogKeys = new Set<string>();
  for (const log of payload.positiveHabitLogs) {
    if (positiveHabitLogIds.has(log.id))
      throw new InconsistentImportDataError(
        `import: duplicate positiveHabitLog ID "${log.id}" detected`,
      );
    positiveHabitLogIds.add(log.id);
    if (!positiveHabitIds.has(log.positiveHabitId))
      throw new InconsistentImportDataError(
        `import: positiveHabitLog "${log.id}" references unknown positiveHabitId "${log.positiveHabitId}"`,
      );
    const key = `${log.positiveHabitId}:${log.scheduledAt}`;
    if (positiveHabitLogKeys.has(key))
      throw new InconsistentImportDataError(
        `import: duplicate positive habit log for positiveHabitId "${log.positiveHabitId}" on "${log.scheduledAt}"`,
      );
    positiveHabitLogKeys.add(key);
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
      await clearAllData(db);
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
          [
            t.id,
            t.label,
            t.frequency,
            t.reminderTime,
            t.reminderEnabled ? 1 : 0,
            t.reminderDay ?? null,
            t.createdAt,
            index,
          ],
          false,
        );
      }
      for (const tl of payload.treatmentLogs) {
        // INSERT OR IGNORE: replace mode calls clearAllData before this loop, so duplicate rows
        // can only come from within the imported file itself. validateNoOrphans already rejects
        // files with duplicate (treatmentId, scheduledAt) pairs, so this is a belt-and-suspenders
        // guard. OR REPLACE is intentionally avoided: if clearAllData were ever made partial in
        // a future merge mode, OR REPLACE would silently overwrite post-export edits.
        await db.run(
          "INSERT OR IGNORE INTO treatment_logs (id, treatment_id, scheduled_at, status) VALUES (?, ?, ?, ?)",
          [tl.id, tl.treatmentId, tl.scheduledAt, tl.status],
          false,
        );
      }
      for (const [index, h] of payload.positiveHabits.entries()) {
        await db.run(
          "INSERT INTO positive_habits (id, label, icon, color, bg_color, frequency, reminder_time, reminder_enabled, reminder_day, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            h.id,
            h.label,
            h.icon,
            h.color,
            h.bgColor,
            h.frequency,
            h.reminderTime,
            h.reminderEnabled ? 1 : 0,
            h.reminderDay ?? null,
            h.createdAt,
            index,
          ],
          false,
        );
      }
      for (const phl of payload.positiveHabitLogs) {
        // INSERT OR IGNORE: same rationale as treatment_logs above.
        await db.run(
          "INSERT OR IGNORE INTO positive_habit_logs (id, positive_habit_id, scheduled_at, status) VALUES (?, ?, ?, ?)",
          [phl.id, phl.positiveHabitId, phl.scheduledAt, phl.status],
          false,
        );
      }
      // Backfill "already notified" milestone bookkeeping from the imported taken counts.
      // This bookkeeping is derived/technical state, not part of the export payload itself,
      // but reconstructing it here prevents a threshold already reached before export from
      // firing again after a post-import taken → missed → taken toggle.
      const takenCounts = new Map<string, number>();
      for (const phl of payload.positiveHabitLogs) {
        if (phl.status !== "taken") continue;
        takenCounts.set(phl.positiveHabitId, (takenCounts.get(phl.positiveHabitId) ?? 0) + 1);
      }
      for (const [positiveHabitId, count] of takenCounts) {
        for (const grade of POSITIVE_GRADES.filter((g) => g.threshold <= count)) {
          await db.run(
            "INSERT OR IGNORE INTO positive_habit_milestone_notifications (positive_habit_id, threshold) VALUES (?, ?)",
            [positiveHabitId, grade.threshold],
            false,
          );
        }
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
    try {
      return await decryptPayload(raw, password);
    } catch (err) {
      if (err instanceof WrongPasswordError) throw err;
      if (err instanceof CorruptFileError) throw err;
      throw new InvalidImportFileError(err);
    }
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

export { WrongPasswordError, CorruptFileError };
