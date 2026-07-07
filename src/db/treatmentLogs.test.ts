import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTreatmentLogsByTreatmentId,
  getTreatmentLogsByDate,
  getAllTreatmentLogs,
  upsertTreatmentLogForDate,
} from "./treatmentLogs";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({ withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb), withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb) }));

const ROW = { id: 7, treatment_id: 3, scheduled_at: "2024-06-01", status: "taken" };
const LOG = { id: "7", treatmentId: "3", scheduledAt: "2024-06-01", status: "taken" as const };

beforeEach(() => { vi.clearAllMocks(); });

describe("getTreatmentLogsByTreatmentId", () => {
  it("returns logs for treatment", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getTreatmentLogsByTreatmentId("3")).toEqual([LOG]);
  });

  it("returns empty when none", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getTreatmentLogsByTreatmentId("3")).toEqual([]);
  });
});

describe("getTreatmentLogsByDate", () => {
  it("returns logs for a given date", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getTreatmentLogsByDate("2024-06-01")).toEqual([LOG]);
  });
});

describe("getAllTreatmentLogs", () => {
  it("returns all logs", async () => {
    mockDb.query.mockResolvedValue({ values: [ROW] });
    expect(await getAllTreatmentLogs()).toHaveLength(1);
  });
});

describe("upsertTreatmentLogForDate", () => {
  it("uses atomic ON CONFLICT upsert and returns the row", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValue({ values: [ROW] });
    const result = await upsertTreatmentLogForDate("3", "2024-06-01", "taken");
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
    const result = await upsertTreatmentLogForDate("3", "2024-06-01", "missed");
    expect(result.status).toBe("missed");
    expect(mockDb.query).toHaveBeenCalledTimes(1);
  });

  it("throws when row not found after upsert", async () => {
    mockDb.run.mockResolvedValue({});
    mockDb.query.mockResolvedValue({ values: [] });
    await expect(upsertTreatmentLogForDate("3", "2024-06-01", "taken")).rejects.toThrow(
      "Failed to upsert treatment log",
    );
  });
});
