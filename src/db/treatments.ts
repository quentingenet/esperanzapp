import type { Treatment, Frequency } from "@/types";
import { withDb, withDbVoid } from "./client";

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
  return {
    id: String(row.id),
    label: row.label,
    frequency: row.frequency as Frequency,
    reminderTime: row.reminder_time,
    reminderEnabled: row.reminder_enabled !== 0,
    reminderDay: row.reminder_day ?? null,
    createdAt: row.created_at,
  };
}

export function createTreatment(data: Omit<Treatment, "id">): Promise<Treatment> {
  return withDb(async (db) => {
    const result = await db.run(
      "INSERT INTO treatments (label, frequency, reminder_time, reminder_enabled, reminder_day, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [data.label, data.frequency, data.reminderTime, data.reminderEnabled ? 1 : 0, data.reminderDay ?? null, data.createdAt],
    );
    const lastId = result.changes?.lastId;
    if (!lastId) throw new Error("Failed to insert treatment");
    return { ...data, id: String(lastId) };
  }, { ...data, id: String(Date.now()) });
}

export function getTreatmentById(id: string): Promise<Treatment | null> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM treatments WHERE id = ?", [id]);
    const rows = (result.values ?? []) as TreatmentRow[];
    return rows[0] ? rowToTreatment(rows[0]) : null;
  }, null);
}

export function getAllTreatments(): Promise<Treatment[]> {
  return withDb(async (db) => {
    const result = await db.query("SELECT * FROM treatments ORDER BY created_at ASC");
    return ((result.values ?? []) as TreatmentRow[]).map(rowToTreatment);
  }, []);
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
    await db.run(`UPDATE treatments SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  });
}

export function deleteTreatment(id: string): Promise<void> {
  return withDbVoid(async (db) => { await db.run("DELETE FROM treatments WHERE id = ?", [id]); });
}
