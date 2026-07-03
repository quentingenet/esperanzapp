import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { Habit } from "@/types";
import { runInTransaction, withDb, withDbVoid } from "./client";
import { updateSortOrder } from "./sortOrder";

type HabitRow = {
  id: number;
  label: string;
  icon: string;
  color: string;
  bg_color: string;
  start_date: string;
  created_at: string;
};

function rowToHabit(row: HabitRow): Habit {
  return {
    id: String(row.id),
    label: row.label,
    icon: row.icon,
    color: row.color,
    bgColor: row.bg_color,
    startDate: row.start_date,
    createdAt: row.created_at,
  };
}

async function insertHabit(
  db: SQLiteDBConnection,
  data: Omit<Habit, "id">,
  transaction = true,
): Promise<Habit> {
  await db.run(
    "INSERT INTO habits (label, icon, color, bg_color, start_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [data.label, data.icon, data.color, data.bgColor, data.startDate, data.createdAt],
    transaction,
  );
  const idRow = await db.query("SELECT last_insert_rowid() AS id");
  const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
  if (!lastId) throw new Error("Failed to insert habit");
  return { ...data, id: String(lastId) };
}

export function createHabit(data: Omit<Habit, "id">, dbConn?: SQLiteDBConnection | null): Promise<Habit> {
  const fn = (database: SQLiteDBConnection): Promise<Habit> => insertHabit(database, data);
  if (dbConn) return fn(dbConn);
  return withDb(fn, { ...data, id: String(Date.now()) });
}

export function createHabitWithInitialLog(
  data: Omit<Habit, "id">,
  eventDate: string,
): Promise<Habit> {
  return runInTransaction(async (database) => {
    if (!database) return { ...data, id: String(Date.now()) };
    const habit = await insertHabit(database, data, false);
    await database.run(
      "INSERT INTO habit_logs (habit_id, event_type, event_date) VALUES (?, 'start', ?)",
      [habit.id, eventDate],
      false,
    );
    return habit;
  });
}

export function recordHabitRelapse(habitId: string, eventDate: string): Promise<void> {
  return runInTransaction(async (database) => {
    if (!database) return;
    await database.run(
      "INSERT INTO habit_logs (habit_id, event_type, event_date) VALUES (?, 'relapse', ?)",
      [habitId, eventDate],
      false,
    );
    await database.run(
      "INSERT INTO habit_logs (habit_id, event_type, event_date) VALUES (?, 'start', ?)",
      [habitId, eventDate],
      false,
    );
  });
}

export function getHabitById(id: string): Promise<Habit | null> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM habits WHERE id = ?", [id]);
    const rows = (result.values ?? []) as HabitRow[];
    return rows[0] ? rowToHabit(rows[0]) : null;
  }, null);
}

export function getAllHabits(): Promise<Habit[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM habits ORDER BY sort_index ASC, created_at ASC");
    return ((result.values ?? []) as HabitRow[]).map(rowToHabit);
  }, []);
}

export function updateHabitsSortOrder(orderedIds: string[]): Promise<void> {
  return updateSortOrder("habits", orderedIds);
}

export function updateHabit(
  id: string,
  data: Partial<Omit<Habit, "id" | "createdAt">>,
): Promise<void> {
  return withDbVoid(async (db) => {
    const fields: string[] = [];
    const values: string[] = [];
    if (data.label !== undefined) { fields.push("label = ?"); values.push(data.label); }
    if (data.icon !== undefined) { fields.push("icon = ?"); values.push(data.icon); }
    if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
    if (data.bgColor !== undefined) { fields.push("bg_color = ?"); values.push(data.bgColor); }
    if (data.startDate !== undefined) { fields.push("start_date = ?"); values.push(data.startDate); }
    if (!fields.length) return;
    await db.run(`UPDATE habits SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  });
}

export function deleteHabit(id: string): Promise<void> {
  return runInTransaction(async (database) => {
    if (!database) return;
    await database.run("DELETE FROM habit_logs WHERE habit_id = ?", [id], false);
    await database.run("DELETE FROM habits WHERE id = ?", [id], false);
  });
}
