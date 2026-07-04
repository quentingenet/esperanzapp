import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTreatment,
  getAllTreatments,
  updateTreatment,
  deleteTreatment,
} from "./treatments";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({
  getDb: () => mockDb,
  withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
  withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb),
  runInTransaction: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
}));

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

describe("getAllTreatments", () => {
  it("returns all mapped treatments", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await getAllTreatments();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(TREATMENT);
  });
});

describe("updateTreatment", () => {
  it("updates label, frequency and reminderDay together", async () => {
    mockDb.run.mockResolvedValue({});
    await updateTreatment("3", { label: "Sertraline", frequency: "weekly", reminderDay: 1 });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE treatments SET"),
      ["Sertraline", "weekly", 1, "3"],
    );
  });

  it("does nothing when no fields", async () => {
    await updateTreatment("3", {});
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it("throws when reminderDay is out of range (above 28)", async () => {
    await expect(updateTreatment("3", { reminderDay: 29 })).rejects.toThrow(
      "updateTreatment: reminderDay must be null or 0 to 28",
    );
  });

  it("throws when reminderDay is negative", async () => {
    await expect(updateTreatment("3", { reminderDay: -1 })).rejects.toThrow(
      "updateTreatment: reminderDay must be null or 0 to 28",
    );
  });

  it("accepts reminderDay null (disabling reminder)", async () => {
    mockDb.run.mockResolvedValue({});
    await updateTreatment("3", { reminderDay: null });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE treatments SET"),
      [null, "3"],
    );
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
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM treatment_logs WHERE treatment_id = ?", ["7"], false);
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM treatments WHERE id = ?", ["7"], false);
  });

  it("propagates a parent deletion failure so log deletion can roll back", async () => {
    mockDb.run.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("delete failed"));
    await expect(deleteTreatment("7")).rejects.toThrow("delete failed");
  });
});
