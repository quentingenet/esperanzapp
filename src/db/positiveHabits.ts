import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { PositiveHabit } from "@/types";
import { isFrequency } from "@/utils";
import { runInTransaction, withDb, withDbVoid } from "./client";
import { updateSortOrder } from "./sortOrder";
import { validateReminderInvariant, validatePartialReminderDay } from "./reminderInvariant";

type PositiveHabitRow = {
  id: number;
  label: string;
  icon: string;
  color: string;
  bg_color: string;
  frequency: string;
  reminder_time: string;
  reminder_enabled: number;
  reminder_day: number | null;
  created_at: string;
};

function rowToPositiveHabit(row: PositiveHabitRow): PositiveHabit {
  if (!isFrequency(row.frequency)) throw new Error(`Invalid frequency in DB: ${row.frequency}`);
  return {
    id: String(row.id),
    label: row.label,
    icon: row.icon,
    color: row.color,
    bgColor: row.bg_color,
    frequency: row.frequency,
    reminderTime: row.reminder_time,
    reminderEnabled: row.reminder_enabled !== 0,
    reminderDay: row.reminder_day ?? null,
    createdAt: row.created_at,
  };
}

export function createPositiveHabit(
  data: Omit<PositiveHabit, "id">,
  dbConn?: SQLiteDBConnection | null,
): Promise<PositiveHabit> {
  const fn = async (db: SQLiteDBConnection): Promise<PositiveHabit> => {
    validateReminderInvariant("PositiveHabit", data.frequency, data.reminderDay);
    await db.run(
      "INSERT INTO positive_habits (label, icon, color, bg_color, frequency, reminder_time, reminder_enabled, reminder_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.label,
        data.icon,
        data.color,
        data.bgColor,
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
    if (!lastId) throw new Error("Failed to insert positive habit");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return runInTransaction((db) => {
    if (!db) throw new Error("DB not initialized");
    return fn(db);
  });
}

export function getAllPositiveHabits(): Promise<PositiveHabit[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM positive_habits ORDER BY sort_index ASC, created_at ASC",
    );
    return ((result.values ?? []) as PositiveHabitRow[]).map(rowToPositiveHabit);
  }, []);
}

export function updatePositiveHabitsSortOrder(orderedIds: string[]): Promise<void> {
  return updateSortOrder("positive_habits", orderedIds);
}

export function updatePositiveHabit(
  id: string,
  data: Partial<Omit<PositiveHabit, "id" | "createdAt">>,
  dbConn?: SQLiteDBConnection | null,
): Promise<void> {
  const fn = async (db: SQLiteDBConnection): Promise<void> => {
    if (data.frequency !== undefined) {
      const reminderDay = data.reminderDay !== undefined ? data.reminderDay : null;
      validateReminderInvariant("PositiveHabit", data.frequency, reminderDay);
    } else if (data.reminderDay !== undefined && data.reminderDay !== null) {
      validatePartialReminderDay("updatePositiveHabit", data.reminderDay);
    }
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (data.label !== undefined) {
      fields.push("label = ?");
      values.push(data.label);
    }
    if (data.icon !== undefined) {
      fields.push("icon = ?");
      values.push(data.icon);
    }
    if (data.color !== undefined) {
      fields.push("color = ?");
      values.push(data.color);
    }
    if (data.bgColor !== undefined) {
      fields.push("bg_color = ?");
      values.push(data.bgColor);
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
    await db.run(
      `UPDATE positive_habits SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id],
      false,
    );
  };
  if (dbConn) return fn(dbConn);
  return withDbVoid(fn);
}

export function deletePositiveHabit(
  id: string,
  dbConn?: SQLiteDBConnection | null,
): Promise<void> {
  const fn = async (db: SQLiteDBConnection): Promise<void> => {
    await db.run("DELETE FROM positive_habit_logs WHERE positive_habit_id = ?", [id], false);
    await db.run("DELETE FROM positive_habits WHERE id = ?", [id], false);
  };
  if (dbConn) return fn(dbConn);
  return runInTransaction(async (database) => {
    if (!database) return;
    return fn(database);
  });
}
