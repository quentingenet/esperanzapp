import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPositiveHabit,
  getAllPositiveHabits,
  updatePositiveHabit,
  deletePositiveHabit,
} from "./positiveHabits";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({
  getDb: () => mockDb,
  withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
  withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb),
  runInTransaction: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
}));

const ROW = {
  id: 3,
  label: "Course à pied",
  icon: "M...",
  color: "#2e7d32",
  bg_color: "#e8f5e9",
  frequency: "weekly",
  reminder_time: "07:00",
  reminder_enabled: 1,
  reminder_day: 1,
  created_at: "2024-06-01T09:00:00Z",
  is_custom: 1,
};
const POSITIVE_HABIT = {
  id: "3",
  label: "Course à pied",
  icon: "M...",
  color: "#2e7d32",
  bgColor: "#e8f5e9",
  frequency: "weekly" as const,
  reminderTime: "07:00",
  reminderEnabled: true,
  reminderDay: 1,
  createdAt: "2024-06-01T09:00:00Z",
  isCustom: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPositiveHabit", () => {
  it("inserts and returns positive habit with id", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 3 }] });
    const { id, ...data } = POSITIVE_HABIT;
    const result = await createPositiveHabit(data);
    expect(result).toEqual(POSITIVE_HABIT);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO positive_habits"),
      expect.arrayContaining([data.label, data.icon, data.color, data.bgColor, data.frequency]),
      expect.anything(),
    );
  });

  it("throws when last_insert_rowid returns 0", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 0 }] });
    const { id, ...data } = POSITIVE_HABIT;
    await expect(createPositiveHabit(data)).rejects.toThrow("Failed to insert positive habit");
  });

  it("throws when reminder invariant is violated", async () => {
    const { id, ...data } = POSITIVE_HABIT;
    await expect(
      createPositiveHabit({ ...data, frequency: "daily", reminderDay: 1 }),
    ).rejects.toThrow("PositiveHabit invariant violated: daily must have reminderDay null");
  });
});

describe("getAllPositiveHabits", () => {
  it("returns all mapped positive habits", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await getAllPositiveHabits();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(POSITIVE_HABIT);
  });
});

describe("updatePositiveHabit", () => {
  it("updates label, icon and color together", async () => {
    mockDb.run.mockResolvedValue({});
    await updatePositiveHabit("3", { label: "Yoga", icon: "M2", color: "#111" });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE positive_habits SET"),
      ["Yoga", "M2", "#111", "3"],
      expect.anything(),
    );
  });

  it("does nothing when no fields", async () => {
    await updatePositiveHabit("3", {});
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it("throws when reminderDay is out of range (above 28)", async () => {
    await expect(updatePositiveHabit("3", { reminderDay: 29 })).rejects.toThrow(
      "updatePositiveHabit: reminderDay must be null or 0 to 28",
    );
  });

  it("throws when frequency daily is set with non-null reminderDay", async () => {
    await expect(updatePositiveHabit("3", { frequency: "daily", reminderDay: 1 })).rejects.toThrow(
      "PositiveHabit invariant violated: daily must have reminderDay null",
    );
  });

  it("accepts valid frequency monthly with reminderDay 0 (last day)", async () => {
    mockDb.run.mockResolvedValue({});
    await updatePositiveHabit("3", { frequency: "monthly", reminderDay: 0 });
    expect(mockDb.run).toHaveBeenCalled();
  });

  it("throws when renaming a non-custom (preset) positive habit", async () => {
    mockDb.query.mockResolvedValueOnce({ values: [{ is_custom: 0 }] });
    await expect(updatePositiveHabit("3", { label: "Nouveau nom" })).rejects.toThrow(
      "updatePositiveHabit: cannot rename a non-custom habit",
    );
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it("allows renaming a custom positive habit", async () => {
    mockDb.query.mockResolvedValueOnce({ values: [{ is_custom: 1 }] });
    mockDb.run.mockResolvedValue({});
    await updatePositiveHabit("3", { label: "Nouveau nom" });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE positive_habits SET"),
      ["Nouveau nom", "3"],
      expect.anything(),
    );
  });

  it("does not check is_custom when label is not being changed", async () => {
    mockDb.run.mockResolvedValue({});
    await updatePositiveHabit("3", { icon: "M2" });
    expect(mockDb.query).not.toHaveBeenCalled();
    expect(mockDb.run).toHaveBeenCalled();
  });
});

describe("deletePositiveHabit", () => {
  it("deletes associated positive_habit_logs before deleting the positive habit", async () => {
    mockDb.run.mockResolvedValue({});
    const order: string[] = [];
    mockDb.run.mockImplementation(async (sql: string) => {
      if (sql.includes("positive_habit_logs")) order.push("logs");
      else if (sql.includes("positive_habits")) order.push("habit");
    });
    await deletePositiveHabit("3");
    expect(order).toEqual(["logs", "habit"]);
  });

  it("passes correct id to both DELETE statements", async () => {
    mockDb.run.mockResolvedValue({});
    await deletePositiveHabit("7");
    expect(mockDb.run).toHaveBeenCalledWith(
      "DELETE FROM positive_habit_logs WHERE positive_habit_id = ?",
      ["7"],
      false,
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      "DELETE FROM positive_habits WHERE id = ?",
      ["7"],
      false,
    );
  });

  it("propagates a parent deletion failure so log deletion can roll back", async () => {
    mockDb.run.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("delete failed"));
    await expect(deletePositiveHabit("7")).rejects.toThrow("delete failed");
  });
});
