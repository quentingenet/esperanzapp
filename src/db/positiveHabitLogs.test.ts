import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPositiveHabitLogsByPositiveHabitId,
  getPositiveHabitLogsByDate,
  getAllPositiveHabitLogs,
  upsertPositiveHabitLogForDate,
  getPositiveHabitTakenCount,
  hasNotifiedMilestone,
  markMilestoneNotified,
} from "./positiveHabitLogs";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({
  withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
  withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb),
  runInTransaction: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb),
}));

const ROW = { id: 7, positive_habit_id: 3, scheduled_at: "2024-06-01", status: "taken" };
const LOG = { id: "7", positiveHabitId: "3", scheduledAt: "2024-06-01", status: "taken" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPositiveHabitLogsByPositiveHabitId", () => {
  it("returns logs for the positive habit", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getPositiveHabitLogsByPositiveHabitId("3")).toEqual([LOG]);
  });

  it("returns empty when none", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getPositiveHabitLogsByPositiveHabitId("3")).toEqual([]);
  });
});

describe("getPositiveHabitLogsByDate", () => {
  it("returns logs for a given date", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getPositiveHabitLogsByDate("2024-06-01")).toEqual([LOG]);
  });
});

describe("getAllPositiveHabitLogs", () => {
  it("returns all logs", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getAllPositiveHabitLogs()).toHaveLength(1);
  });
});

describe("upsertPositiveHabitLogForDate", () => {
  it("uses atomic ON CONFLICT upsert and returns the row", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await upsertPositiveHabitLogForDate("3", "2024-06-01", "taken");
    expect(result).toEqual(LOG);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      ["3", "2024-06-01", "taken"],
      expect.anything(),
    );
    expect(mockDb.run).toHaveBeenCalledTimes(1);
  });

  it("reads back the row after upsert (single query)", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValue({ values: [{ ...ROW, status: "missed" }] });
    const result = await upsertPositiveHabitLogForDate("3", "2024-06-01", "missed");
    expect(result.status).toBe("missed");
    expect(mockDb.query).toHaveBeenCalledTimes(1);
  });

  it("throws when row not found after upsert", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValue({ values: [] });
    await expect(upsertPositiveHabitLogForDate("3", "2024-06-01", "taken")).rejects.toThrow(
      "Failed to upsert positive habit log",
    );
  });
});

describe("getPositiveHabitTakenCount", () => {
  it("returns the count from the query result", async () => {
    mockDb.query.mockResolvedValue({ values: [{ count: 5 }] });
    expect(await getPositiveHabitTakenCount("3")).toBe(5);
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining("status = 'taken'"), ["3"]);
  });

  it("returns 0 when no rows match", async () => {
    mockDb.query.mockResolvedValue({ values: [{ count: 0 }] });
    expect(await getPositiveHabitTakenCount("3")).toBe(0);
  });
});

describe("hasNotifiedMilestone", () => {
  it("returns true when a matching row exists", async () => {
    mockDb.query.mockResolvedValue({ values: [{ 1: 1 }] });
    expect(await hasNotifiedMilestone("3", 7)).toBe(true);
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining("threshold = ?"), ["3", 7]);
  });

  it("returns false when no matching row exists", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await hasNotifiedMilestone("3", 7)).toBe(false);
  });
});

describe("markMilestoneNotified", () => {
  it("inserts the threshold with INSERT OR IGNORE", async () => {
    mockDb.run.mockResolvedValue({});
    await markMilestoneNotified("3", 7);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE"),
      ["3", 7],
      expect.anything(),
    );
  });
});
