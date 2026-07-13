import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { Treatment } from "@/types";
import { isFrequency } from "@/utils";
import { runInTransaction, withDb, withDbVoid } from "./client";
import { updateSortOrder } from "./sortOrder";
import { validateReminderInvariant, validatePartialReminderDay } from "./reminderInvariant";

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

export function createTreatment(
  data: Omit<Treatment, "id">,
  dbConn?: SQLiteDBConnection | null,
): Promise<Treatment> {
  const fn = async (db: SQLiteDBConnection): Promise<Treatment> => {
    validateReminderInvariant("Treatment", data.frequency, data.reminderDay);
    await db.run(
      "INSERT INTO treatments (label, frequency, reminder_time, reminder_enabled, reminder_day, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.label,
        data.frequency,
        data.reminderTime,
        data.reminderEnabled ? 1 : 0,
        data.reminderDay ?? null,
        data.createdAt,
      ],
      false,
    );
    const idRow = await db.query("SELECT last_insert_rowid() AS id");
    const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
    if (!lastId) throw new Error("Failed to insert treatment");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return runInTransaction((db) => {
    if (!db) throw new Error("DB not initialized");
    return fn(db);
  });
}

export function getAllTreatments(): Promise<Treatment[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM treatments ORDER BY sort_index ASC, created_at ASC",
    );
    return ((result.values ?? []) as TreatmentRow[]).map(rowToTreatment);
  }, []);
}

export function updateTreatmentsSortOrder(orderedIds: string[]): Promise<void> {
  return updateSortOrder("treatments", orderedIds);
}

export function updateTreatment(
  id: string,
  data: Partial<Omit<Treatment, "id" | "createdAt">>,
  dbConn?: SQLiteDBConnection | null,
): Promise<void> {
  const fn = async (db: SQLiteDBConnection): Promise<void> => {
    if (data.frequency !== undefined) {
      const reminderDay = data.reminderDay !== undefined ? data.reminderDay : null;
      validateReminderInvariant("Treatment", data.frequency, reminderDay);
    } else if (data.reminderDay !== undefined && data.reminderDay !== null) {
      validatePartialReminderDay("updateTreatment", data.reminderDay);
    }
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (data.label !== undefined) {
      fields.push("label = ?");
      values.push(data.label);
    }
    if (data.frequency !== undefined) {
      fields.push("frequency = ?");
      values.push(data.frequency);
    }
    if (data.reminderTime !== undefined) {
      fields.push("reminder_time = ?");
      values.push(data.reminderTime);
    }
    if (data.reminderEnabled !== undefined) {
      fields.push("reminder_enabled = ?");
      values.push(data.reminderEnabled ? 1 : 0);
    }
    if (data.reminderDay !== undefined) {
      fields.push("reminder_day = ?");
      values.push(data.reminderDay ?? null);
    }
    if (!fields.length) return;
    await db.run(`UPDATE treatments SET ${fields.join(", ")} WHERE id = ?`, [...values, id], false);
  };
  if (dbConn) return fn(dbConn);
  return withDbVoid(fn);
}

export function deleteTreatment(id: string, dbConn?: SQLiteDBConnection | null): Promise<void> {
  const fn = async (db: SQLiteDBConnection): Promise<void> => {
    await db.run("DELETE FROM treatment_logs WHERE treatment_id = ?", [id], false);
    await db.run("DELETE FROM treatments WHERE id = ?", [id], false);
  };
  if (dbConn) return fn(dbConn);
  return runInTransaction(async (database) => {
    if (!database) return;
    return fn(database);
  });
}
