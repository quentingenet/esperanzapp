import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { Habit, HabitLog, TreatmentLog, PositiveHabitLog } from "@/types";
import { withDb } from "@/db/client";

export function createHabit(
  data: Omit<Habit, "id">,
  dbConn?: SQLiteDBConnection | null,
): Promise<Habit> {
  const fn = async (db: SQLiteDBConnection): Promise<Habit> => {
    await db.run(
      "INSERT INTO habits (label, icon, color, bg_color, start_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [data.label, data.icon, data.color, data.bgColor, data.startDate, data.createdAt],
    );
    const idRow = await db.query("SELECT last_insert_rowid() AS id");
    const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
    if (!lastId) throw new Error("Failed to insert habit");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return withDb(fn, { ...data, id: String(Date.now()) });
}

export function createHabitLog(
  data: Omit<HabitLog, "id">,
  dbConn?: SQLiteDBConnection | null,
): Promise<HabitLog> {
  const fn = async (db: SQLiteDBConnection): Promise<HabitLog> => {
    await db.run("INSERT INTO habit_logs (habit_id, event_type, event_date) VALUES (?, ?, ?)", [
      data.habitId,
      data.eventType,
      data.eventDate,
    ]);
    const idRow = await db.query("SELECT last_insert_rowid() AS id");
    const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
    if (!lastId) throw new Error("Failed to insert habit log");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return withDb(fn, { ...data, id: String(Date.now()) });
}

export function createTreatmentLog(
  data: Omit<TreatmentLog, "id">,
  dbConn?: SQLiteDBConnection | null,
): Promise<TreatmentLog> {
  const fn = async (db: SQLiteDBConnection): Promise<TreatmentLog> => {
    await db.run(
      "INSERT INTO treatment_logs (treatment_id, scheduled_at, status) VALUES (?, ?, ?)",
      [data.treatmentId, data.scheduledAt, data.status],
    );
    const idRow = await db.query("SELECT last_insert_rowid() AS id");
    const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
    if (!lastId) throw new Error("Failed to insert treatment log");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return withDb(fn, { ...data, id: String(Date.now()) });
}

export function createPositiveHabitLog(
  data: Omit<PositiveHabitLog, "id">,
  dbConn?: SQLiteDBConnection | null,
): Promise<PositiveHabitLog> {
  const fn = async (db: SQLiteDBConnection): Promise<PositiveHabitLog> => {
    await db.run(
      "INSERT INTO positive_habit_logs (positive_habit_id, scheduled_at, status) VALUES (?, ?, ?)",
      [data.positiveHabitId, data.scheduledAt, data.status],
    );
    const idRow = await db.query("SELECT last_insert_rowid() AS id");
    const lastId = (idRow.values?.[0] as { id?: number } | undefined)?.id;
    if (!lastId) throw new Error("Failed to insert positive habit log");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return withDb(fn, { ...data, id: String(Date.now()) });
}
