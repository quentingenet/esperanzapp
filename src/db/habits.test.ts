import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHabitWithInitialLog,
  recordHabitRelapse,
  getAllHabits,
  deleteHabit,
} from "./habits";
import { createHabit } from "./testHelpers";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({
  getDb: () => mockDb,
  withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
  withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb),
  runInTransaction: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
}));

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

describe("atomic habit operations", () => {
  it("creates the habit and initial log in the same transaction", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 1 }] });
    const { id, ...data } = HABIT;

    await expect(createHabitWithInitialLog(data, data.startDate)).resolves.toEqual(HABIT);
    expect(mockDb.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO habits"),
      expect.any(Array),
      expect.anything(),
    );
    expect(mockDb.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO habit_logs"),
      ["1", data.startDate],
      expect.anything(),
    );
  });

  it("propagates an initial log failure so the transaction can roll back", async () => {
    mockDb.run.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("log failed"));
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 1 }] });
    const { id, ...data } = HABIT;

    await expect(createHabitWithInitialLog(data, data.startDate)).rejects.toThrow("log failed");
  });

  it("records relapse and restart in the same transaction", async () => {
    mockDb.run.mockResolvedValue({});

    await recordHabitRelapse("1", "2024-02-01");

    expect(mockDb.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("'relapse'"),
      ["1", "2024-02-01"],
      expect.anything(),
    );
    expect(mockDb.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("'start'"),
      ["1", "2024-02-01"],
      expect.anything(),
    );
  });

  it("propagates a restart failure so the relapse transaction can roll back", async () => {
    mockDb.run.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("restart failed"));

    await expect(recordHabitRelapse("1", "2024-02-01")).rejects.toThrow("restart failed");
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
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM habit_logs WHERE habit_id = ?", ["42"], expect.anything());
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM habits WHERE id = ?", ["42"], expect.anything());
  });

  it("propagates a parent deletion failure so log deletion can roll back", async () => {
    mockDb.run.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("delete failed"));
    await expect(deleteHabit("42")).rejects.toThrow("delete failed");
  });
});
