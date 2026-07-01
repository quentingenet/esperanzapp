import type { TreatmentLog, TreatmentStatus } from "@/types";
import { isTreatmentStatus } from "@/utils";
import { withDb, withDbVoid } from "./client";

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

export function createTreatmentLog(data: Omit<TreatmentLog, "id">): Promise<TreatmentLog> {
  return withDb(async (db) => {
    const result = await db.run(
      "INSERT INTO treatment_logs (treatment_id, scheduled_at, status) VALUES (?, ?, ?)",
      [data.treatmentId, data.scheduledAt, data.status],
    );
    const lastId = result.changes?.lastId;
    if (!lastId) throw new Error("Failed to insert treatment log");
    return { ...data, id: String(lastId) };
  }, { ...data, id: String(Date.now()) });
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

export function updateTreatmentLogStatus(id: string, status: TreatmentStatus): Promise<void> {
  return withDbVoid(async (db) => {
    await db.run("UPDATE treatment_logs SET status = ? WHERE id = ?", [status, id]);
  });
}

export function getAllTreatmentLogs(): Promise<TreatmentLog[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM treatment_logs ORDER BY scheduled_at ASC");
    return ((result.values ?? []) as TreatmentLogRow[]).map(rowToTreatmentLog);
  }, []);
}

export function deleteTreatmentLog(id: string): Promise<void> {
  return withDbVoid(async (db) => { await db.run("DELETE FROM treatment_logs WHERE id = ?", [id]); });
}

export function deleteTreatmentLogsByTreatmentId(treatmentId: string): Promise<void> {
  return withDbVoid(async (db) => { await db.run("DELETE FROM treatment_logs WHERE treatment_id = ?", [treatmentId]); });
}

export function upsertTreatmentLogForDate(
  treatmentId: string,
  scheduledAt: string,
  status: TreatmentStatus,
): Promise<TreatmentLog> {
  return withDb(async (db) => {
    const existing = await db.query(
      "SELECT * FROM treatment_logs WHERE treatment_id = ? AND scheduled_at = ?",
      [treatmentId, scheduledAt],
    );
    const rows = (existing.values ?? []) as TreatmentLogRow[];
    if (rows[0]) {
      await db.run("UPDATE treatment_logs SET status = ? WHERE id = ?", [status, String(rows[0].id)]);
      return rowToTreatmentLog({ ...rows[0], status });
    }
    const result = await db.run(
      "INSERT INTO treatment_logs (treatment_id, scheduled_at, status) VALUES (?, ?, ?)",
      [treatmentId, scheduledAt, status],
    );
    const lastId = result.changes?.lastId;
    if (!lastId) throw new Error("Failed to insert treatment log");
    return { id: String(lastId), treatmentId, scheduledAt, status };
  }, { id: String(Date.now()), treatmentId, scheduledAt, status });
}
