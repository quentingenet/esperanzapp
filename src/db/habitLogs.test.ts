import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHabitLog,
  getHabitLogsByHabitId,
  getLatestHabitLog,
  getAllHabitLogs,
  deleteHabitLog,
  deleteHabitLogsByHabitId,
} from "./habitLogs";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({ withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb), withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb) }));

const ROW = { id: 5, habit_id: 1, event_type: "start", event_date: "2024-01-01" };
const LOG = { id: "5", habitId: "1", eventType: "start" as const, eventDate: "2024-01-01" };

beforeEach(() => { vi.clearAllMocks(); });

describe("createHabitLog", () => {
  it("inserts and returns log with id", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 5 }] });
    const { id, ...data } = LOG;
    const result = await createHabitLog(data);
    expect(result).toEqual(LOG);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habit_logs"),
      expect.arrayContaining([data.habitId, data.eventType, data.eventDate]),
    );
  });

  it("throws when last_insert_rowid returns 0", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValueOnce({ values: [{ id: 0 }] });
    const { id, ...data } = LOG;
    await expect(createHabitLog(data)).rejects.toThrow("Failed to insert habit log");
  });
});

describe("getHabitLogsByHabitId", () => {
  it("returns logs for habit", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await getHabitLogsByHabitId("1");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(LOG);
  });

  it("returns empty array when none", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getHabitLogsByHabitId("1")).toEqual([]);
  });
});

describe("getLatestHabitLog", () => {
  it("returns most recent log", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getLatestHabitLog("1")).toEqual(LOG);
  });

  it("returns null when none", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getLatestHabitLog("1")).toBeNull();
  });
});

describe("getAllHabitLogs", () => {
  it("returns all logs", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getAllHabitLogs()).toHaveLength(1);
  });
});

describe("deleteHabitLog", () => {
  it("deletes by id", async () => {
    mockDb.run.mockResolvedValue({});
    await deleteHabitLog("5");
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM habit_logs WHERE id = ?", ["5"]);
  });
});

describe("deleteHabitLogsByHabitId", () => {
  it("cascades delete to habit", async () => {
    mockDb.run.mockResolvedValue({});
    await deleteHabitLogsByHabitId("1");
    expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM habit_logs WHERE habit_id = ?", ["1"]);
  });
});
