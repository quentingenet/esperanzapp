import type { HabitLog } from "@/types";
import { isEventType } from "@/utils";
import { withDb } from "./client";

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

export function getHabitLogsByHabitId(habitId: string): Promise<HabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY event_date ASC",
      [habitId],
    );
    return ((result.values ?? []) as HabitLogRow[]).map(rowToHabitLog);
  }, []);
}

export function getAllHabitLogs(): Promise<HabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM habit_logs ORDER BY event_date ASC");
    return ((result.values ?? []) as HabitLogRow[]).map(rowToHabitLog);
  }, []);
}
