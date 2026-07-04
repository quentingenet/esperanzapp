import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { Frequency, Treatment } from "@/types";
import { isFrequency } from "@/utils";
import { getDb, runInTransaction, withDb, withDbVoid } from "./client";
import { updateSortOrder } from "./sortOrder";

function validateTreatmentReminderInvariant(frequency: Frequency, reminderDay: number | null): void {
  if (frequency === "daily" && reminderDay !== null)
    throw new Error(`Treatment invariant violated: daily must have reminderDay null, got ${String(reminderDay)}`);
  if (frequency === "weekly" && (reminderDay === null || reminderDay < 0 || reminderDay > 6))
    throw new Error(`Treatment invariant violated: weekly must have reminderDay 0 to 6, got ${String(reminderDay)}`);
  if (frequency === "monthly" && (reminderDay === null || (reminderDay !== 0 && (reminderDay < 1 || reminderDay > 28))))
    throw new Error(`Treatment invariant violated: monthly must have reminderDay 0 or 1 to 28, got ${String(reminderDay)}`);
}

type TreatmentRow = {
  id: number;
  label: string;
  frequency: string;
  reminder_time: string;
  reminder_enabled: number;
  reminder_day: number | null;
  created_at: string;
};

function rowToTreatment(row: TreatmentRow): Treatment {
  if (!isFrequency(row.frequency)) throw new Error(`Invalid frequency in DB: ${row.frequency}`);
  return {
    id: String(row.id),
    label: row.label,
    frequency: row.frequency,
    reminderTime: row.reminder_time,
    reminderEnabled: row.reminder_enabled !== 0,
    reminderDay: row.reminder_day ?? null,
    createdAt: row.created_at,
  };
}

export function createTreatment(data: Omit<Treatment, "id">, dbConn?: SQLiteDBConnection | null): Promise<Treatment> {
  const fn = async (db: SQLiteDBConnection): Promise<Treatment> => {
    validateTreatmentReminderInvariant(data.frequency, data.reminderDay);
    await db.run(
      "INSERT INTO treatments (label, frequency, reminder_time, reminder_enabled, reminder_day, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [data.label, data.frequency, data.reminderTime, data.reminderEnabled ? 1 : 0, data.reminderDay ?? null, data.createdAt],
    );
    const idRow = await db.query("SELECT last_insert_rowid() AS id");
    const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
    if (!lastId) throw new Error("Failed to insert treatment");
    return { ...data, id: String(lastId) };
  };
  return fn(dbConn ?? getDb());
}

export function getAllTreatments(): Promise<Treatment[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM treatments ORDER BY sort_index ASC, created_at ASC");
    return ((result.values ?? []) as TreatmentRow[]).map(rowToTreatment);
  }, []);
}

export function updateTreatmentsSortOrder(orderedIds: string[]): Promise<void> {
  return updateSortOrder("treatments", orderedIds);
}

export function updateTreatment(
  id: string,
  data: Partial<Omit<Treatment, "id" | "createdAt">>,
): Promise<void> {
  return withDbVoid(async (db) => {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (data.label !== undefined) { fields.push("label = ?"); values.push(data.label); }
    if (data.frequency !== undefined) { fields.push("frequency = ?"); values.push(data.frequency); }
    if (data.reminderTime !== undefined) { fields.push("reminder_time = ?"); values.push(data.reminderTime); }
    if (data.reminderEnabled !== undefined) { fields.push("reminder_enabled = ?"); values.push(data.reminderEnabled ? 1 : 0); }
    if (data.reminderDay !== undefined) { fields.push("reminder_day = ?"); values.push(data.reminderDay ?? null); }
    if (!fields.length) return;
    if (data.frequency !== undefined && data.reminderDay !== undefined) {
      validateTreatmentReminderInvariant(data.frequency, data.reminderDay);
    }
    await db.run(`UPDATE treatments SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  });
}

export function deleteTreatment(id: string): Promise<void> {
  return runInTransaction(async (database) => {
    if (!database) return;
    await database.run("DELETE FROM treatment_logs WHERE treatment_id = ?", [id], false);
    await database.run("DELETE FROM treatments WHERE id = ?", [id], false);
  });
}
