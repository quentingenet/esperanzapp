import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTreatment,
  getTreatmentById,
  getAllTreatments,
  updateTreatment,
  deleteTreatment,
} from "./treatments";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({ withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb), withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb) }));

const ROW = { id: 3, label: "Metformine", frequency: "daily", reminder_time: "08:00", reminder_enabled: 1, reminder_day: null, created_at: "2024-06-01T09:00:00Z" };
const TREATMENT = { id: "3", label: "Metformine", frequency: "daily" as const, reminderTime: "08:00", reminderEnabled: true, reminderDay: null, createdAt: "2024-06-01T09:00:00Z" };

beforeEach(() => { vi.clearAllMocks(); });

describe("createTreatment", () => {
  it("inserts and returns treatment with id", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 3 }] });
    const { id, ...data } = TREATMENT;
    const result = await createTreatment(data);
    expect(result).toEqual(TREATMENT);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO treatments"),
      expect.arrayContaining([data.label, data.frequency, data.reminderTime, 1, null]),
    );
  });

  it("throws when last_insert_rowid returns 0", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 0 }] });
    const { id, ...data } = TREATMENT;
    await expect(createTreatment(data)).rejects.toThrow("Failed to insert treatment");
  });
});

describe("getTreatmentById", () => {
  it("returns treatment when found", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getTreatmentById("3")).toEqual(TREATMENT);
  });

  it("returns null when not found", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getTreatmentById("999")).toBeNull();
  });
});

describe("getAllTreatments", () => {
  it("returns all mapped treatments", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await getAllTreatments();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(TREATMENT);
  });
});

describe("updateTreatment", () => {
  it("updates label and frequency", async () => {
    mockDb.run.mockResolvedValue({});
    await updateTreatment("3", { label: "Sertraline", frequency: "weekly" });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE treatments SET"),
      ["Sertraline", "weekly", "3"],
    );
  });

  it("does nothing when no fields", async () => {
    await updateTreatment("3", {});
    expect(mockDb.run).not.toHaveBeenCalled();
  });
});

describe("deleteTreatment", () => {
  it("deletes associated treatment_logs before deleting the treatment", async () => {
    mockDb.run.mockResolvedValue({});
    const order: string[] = [];
    mockDb.run.mockImplementation(async (sql: string) => {
      if (sql.includes("treatment_logs")) order.push("logs");
      else if (sql.includes("treatments")) order.push("treatment");
    });
    await deleteTreatment("3");
    expect(order).toEqual(["logs", "treatment"]);
  });

  it("passes correct id to both DELETE statements", async () => {
    mockDb.run.mockResolvedValue({});
    await deleteTreatment("7");
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM treatment_logs WHERE treatment_id = ?", ["7"]);
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM treatments WHERE id = ?", ["7"]);
  });
});
