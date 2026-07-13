import type { PositiveHabitLog, TreatmentStatus } from "@/types";
import { isTreatmentStatus } from "@/utils";
import { runInTransaction, withDb } from "./client";

type PositiveHabitLogRow = {
  id: number;
  positive_habit_id: number;
  scheduled_at: string;
  status: string;
};

function rowToPositiveHabitLog(row: PositiveHabitLogRow): PositiveHabitLog {
  if (!isTreatmentStatus(row.status)) throw new Error(`Invalid status in DB: ${row.status}`);
  return {
    id: String(row.id),
    positiveHabitId: String(row.positive_habit_id),
    scheduledAt: row.scheduled_at,
    status: row.status,
  };
}

export function getPositiveHabitLogsByPositiveHabitId(
  positiveHabitId: string,
): Promise<PositiveHabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM positive_habit_logs WHERE positive_habit_id = ? ORDER BY scheduled_at ASC",
      [positiveHabitId],
    );
    return ((result.values ?? []) as PositiveHabitLogRow[]).map(rowToPositiveHabitLog);
  }, []);
}

export function getPositiveHabitLogsByDate(scheduledAt: string): Promise<PositiveHabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM positive_habit_logs WHERE scheduled_at = ? ORDER BY positive_habit_id ASC",
      [scheduledAt],
    );
    return ((result.values ?? []) as PositiveHabitLogRow[]).map(rowToPositiveHabitLog);
  }, []);
}

export function getAllPositiveHabitLogs(): Promise<PositiveHabitLog[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM positive_habit_logs ORDER BY scheduled_at ASC");
    return ((result.values ?? []) as PositiveHabitLogRow[]).map(rowToPositiveHabitLog);
  }, []);
}

export function upsertPositiveHabitLogForDate(
  positiveHabitId: string,
  scheduledAt: string,
  status: TreatmentStatus,
): Promise<PositiveHabitLog> {
  return runInTransaction(async (db) => {
    if (!db) return { id: String(Date.now()), positiveHabitId, scheduledAt, status };
    await db.run(
      `INSERT INTO positive_habit_logs (positive_habit_id, scheduled_at, status)
       VALUES (?, ?, ?)
       ON CONFLICT(positive_habit_id, scheduled_at) DO UPDATE SET status = excluded.status`,
      [positiveHabitId, scheduledAt, status],
      false,
    );
    const result = await db.query(
      "SELECT * FROM positive_habit_logs WHERE positive_habit_id = ? AND scheduled_at = ?",
      [positiveHabitId, scheduledAt],
    );
    const rows = (result.values ?? []) as PositiveHabitLogRow[];
    if (!rows[0]) throw new Error("Failed to upsert positive habit log");
    return rowToPositiveHabitLog(rows[0]);
  });
}

export function getPositiveHabitTakenCount(positiveHabitId: string): Promise<number> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT COUNT(*) AS count FROM positive_habit_logs WHERE positive_habit_id = ? AND status = 'taken'",
      [positiveHabitId],
    );
    return (result.values?.[0] as { count?: number } | undefined)?.count ?? 0;
  }, 0);
}
