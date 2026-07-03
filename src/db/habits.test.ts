import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHabit,
  getHabitById,
  getAllHabits,
  updateHabit,
  deleteHabit,
} from "./habits";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({ withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb), withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb) }));

const ROW = { id: 1, label: "Alcool", icon: "🍺", color: "#3a8fd1", bg_color: "#e8f4ff", start_date: "2024-01-01", created_at: "2024-01-01T10:00:00Z" };
const HABIT = { id: "1", label: "Alcool", icon: "🍺", color: "#3a8fd1", bgColor: "#e8f4ff", startDate: "2024-01-01", createdAt: "2024-01-01T10:00:00Z" };

beforeEach(() => { vi.clearAllMocks(); });

describe("createHabit", () => {
  it("inserts and returns habit with id", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 1 }] });
    const { id, ...data } = HABIT;
    const result = await createHabit(data);
    expect(result).toEqual(HABIT);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.arrayContaining([data.label]),
    );
  });

  it("throws when last_insert_rowid returns 0", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 0 }] });
    const { id, ...data } = HABIT;
    await expect(createHabit(data)).rejects.toThrow("Failed to insert habit");
  });
});

describe("getHabitById", () => {
  it("returns habit when found", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getHabitById("1")).toEqual(HABIT);
  });

  it("returns null when not found", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getHabitById("999")).toBeNull();
  });
});

describe("getAllHabits", () => {
  it("returns all mapped habits", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await getAllHabits();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(HABIT);
  });

  it("returns empty array when none", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getAllHabits()).toEqual([]);
  });
});

describe("updateHabit", () => {
  it("updates label", async () => {
    mockDb.run.mockResolvedValue({});
    await updateHabit("1", { label: "Tabac" });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE habits SET"),
      ["Tabac", "1"],
    );
  });

  it("does nothing when no fields provided", async () => {
    await updateHabit("1", {});
    expect(mockDb.run).not.toHaveBeenCalled();
  });
});

describe("deleteHabit", () => {
  it("deletes associated habit_logs before deleting the habit", async () => {
    mockDb.run.mockResolvedValue({});
    const order: string[] = [];
    mockDb.run.mockImplementation(async (sql: string) => {
      if (sql.includes("habit_logs")) order.push("logs");
      else if (sql.includes("habits")) order.push("habit");
    });
    await deleteHabit("1");
    expect(order).toEqual(["logs", "habit"]);
  });

  it("passes correct id to both DELETE statements", async () => {
    mockDb.run.mockResolvedValue({});
    await deleteHabit("42");
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM habit_logs WHERE habit_id = ?", ["42"]);
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM habits WHERE id = ?", ["42"]);
  });
});
