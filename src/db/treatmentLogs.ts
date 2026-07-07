import type { TreatmentLog, TreatmentStatus } from "@/types";
import { isTreatmentStatus } from "@/utils";
import { withDb } from "./client";

type TreatmentLogRow = {
  id: number;
  treatment_id: number;
  scheduled_at: string;
  status: string;
};

function rowToTreatmentLog(row: TreatmentLogRow): TreatmentLog {
  if (!isTreatmentStatus(row.status)) throw new Error(`Invalid status in DB: ${row.status}`);
  return {
    id: String(row.id),
    treatmentId: String(row.treatment_id),
    scheduledAt: row.scheduled_at,
    status: row.status,
  };
}

export function getTreatmentLogsByTreatmentId(treatmentId: string): Promise<TreatmentLog[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM treatment_logs WHERE treatment_id = ? ORDER BY scheduled_at ASC",
      [treatmentId],
    );
    return ((result.values ?? []) as TreatmentLogRow[]).map(rowToTreatmentLog);
  }, []);
}

export function getTreatmentLogsByDate(scheduledAt: string): Promise<TreatmentLog[]> {
  return withDb(async (db) => {
    const result = await db.query(
      "SELECT * FROM treatment_logs WHERE scheduled_at = ? ORDER BY treatment_id ASC",
      [scheduledAt],
    );
    return ((result.values ?? []) as TreatmentLogRow[]).map(rowToTreatmentLog);
  }, []);
}

export function getAllTreatmentLogs(): Promise<TreatmentLog[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM treatment_logs ORDER BY scheduled_at ASC");
    return ((result.values ?? []) as TreatmentLogRow[]).map(rowToTreatmentLog);
  }, []);
}

export function upsertTreatmentLogForDate(
  treatmentId: string,
  scheduledAt: string,
  status: TreatmentStatus,
): Promise<TreatmentLog> {
  return withDb(async (db) => {
    await db.run(
      `INSERT INTO treatment_logs (treatment_id, scheduled_at, status)
       VALUES (?, ?, ?)
       ON CONFLICT(treatment_id, scheduled_at) DO UPDATE SET status = excluded.status`,
      [treatmentId, scheduledAt, status],
      false,
    );
    const result = await db.query(
      "SELECT * FROM treatment_logs WHERE treatment_id = ? AND scheduled_at = ?",
      [treatmentId, scheduledAt],
    );
    const rows = (result.values ?? []) as TreatmentLogRow[];
    if (!rows[0]) throw new Error("Failed to upsert treatment log");
    return rowToTreatmentLog(rows[0]);
  }, { id: String(Date.now()), treatmentId, scheduledAt, status });
}
