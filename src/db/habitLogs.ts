import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { HabitLog } from "@/types";
import { isEventType } from "@/utils";
import { withDb, withDbVoid } from "./client";

type HabitLogRow = {
  id: number;
  habit_id: number;
  event_type: string;
  event_date: string;
};

function rowToHabitLog(row: HabitLogRow): HabitLog {
  if (!isEventType(row.event_type)) throw new Error(`Invalid event_type in DB: ${row.event_type}`);
  return {
    id: String(row.id),
    habitId: String(row.habit_id),
    eventType: row.event_type,
    eventDate: row.event_date,
  };
}

export function createHabitLog(data: Omit<HabitLog, "id">, dbConn?: SQLiteDBConnection | null): Promise<HabitLog> {
  const fn = async (db: SQLiteDBConnection): Promise<HabitLog> => {
    const result = await db.run(
      "INSERT INTO habit_logs (habit_id, event_type, event_date) VALUES (?, ?, ?)",
      [data.habitId, data.eventType, data.eventDate],
    );
    const lastId = result.changes?.lastId;
    if (!lastId) throw new Error("Failed to insert habit log");
    return { ...data, id: String(lastId) };
  };
  if (dbConn) return fn(dbConn);
  return withDb(fn, { ...data, id: String(Date.now()) });
}

export function getHabitLogsByHabitId(habitId: string): Promise<HabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY event_date ASC",
      [habitId],
    );
    return ((result.values ?? []) as HabitLogRow[]).map(rowToHabitLog);
  }, []);
}

export function getLatestHabitLog(habitId: string): Promise<HabitLog | null> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY event_date DESC LIMIT 1",
      [habitId],
    );
    const rows = (result.values ?? []) as HabitLogRow[];
    return rows[0] ? rowToHabitLog(rows[0]) : null;
  }, null);
}

export function getAllHabitLogs(): Promise<HabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM habit_logs ORDER BY event_date ASC");
    return ((result.values ?? []) as HabitLogRow[]).map(rowToHabitLog);
  }, []);
}

export function deleteHabitLog(id: string): Promise<void> {
  return withDbVoid(async (db) => { await db.run("DELETE FROM habit_logs WHERE id = ?", [id]); });
}

export function deleteHabitLogsByHabitId(habitId: string): Promise<void> {
  return withDbVoid(async (db) => { await db.run("DELETE FROM habit_logs WHERE habit_id = ?", [habitId]); });
}
